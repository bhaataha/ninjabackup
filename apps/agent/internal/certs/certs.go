package certs

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

// CertManager handles TLS certificate creation and loading for mTLS
type CertManager struct {
	certsDir string
}

// NewCertManager creates a certificate manager
func NewCertManager() *CertManager {
	return &CertManager{
		certsDir: certDir(),
	}
}

func certDir() string {
	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("PROGRAMDATA")
		if appData == "" {
			appData = `C:\ProgramData`
		}
		return filepath.Join(appData, "NinjaBackup", "certs")
	case "darwin":
		return "/Library/Application Support/NinjaBackup/certs"
	default:
		return "/etc/ninjabackup/certs"
	}
}

// GenerateAgentCert generates a self-signed client certificate for the agent
// In production, this would be replaced by a proper CA-signed cert flow
func (cm *CertManager) GenerateAgentCert(agentID, hostname string) error {
	if err := os.MkdirAll(cm.certsDir, 0700); err != nil {
		return fmt.Errorf("create certs dir: %w", err)
	}

	// Generate ECDSA P-256 private key
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return fmt.Errorf("generate key: %w", err)
	}

	// Create certificate template
	serialNumber, _ := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))

	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			CommonName:   fmt.Sprintf("agent-%s", agentID),
			Organization: []string{"NinjaBackup Agent"},
		},
		DNSNames: []string{hostname},

		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(365 * 24 * time.Hour), // 1 year

		KeyUsage:    x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	}

	// Self-sign the certificate
	certDER, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return fmt.Errorf("create certificate: %w", err)
	}

	// Write certificate
	certPath := filepath.Join(cm.certsDir, "agent.crt")
	certFile, err := os.Create(certPath)
	if err != nil {
		return fmt.Errorf("create cert file: %w", err)
	}
	defer certFile.Close()
	pem.Encode(certFile, &pem.Block{Type: "CERTIFICATE", Bytes: certDER})

	// Write private key
	keyPath := filepath.Join(cm.certsDir, "agent.key")
	keyFile, err := os.OpenFile(keyPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("create key file: %w", err)
	}
	defer keyFile.Close()

	keyDER, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		return fmt.Errorf("marshal key: %w", err)
	}
	pem.Encode(keyFile, &pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})

	return nil
}

// LoadTLSConfig loads the agent's TLS configuration for mTLS
// Returns a *tls.Config that can be used with http.Client
func (cm *CertManager) LoadTLSConfig(caCertPath string) (*tls.Config, error) {
	// Load agent certificate and key
	certPath := filepath.Join(cm.certsDir, "agent.crt")
	keyPath := filepath.Join(cm.certsDir, "agent.key")

	cert, err := tls.LoadX509KeyPair(certPath, keyPath)
	if err != nil {
		return nil, fmt.Errorf("load agent certificate: %w", err)
	}

	// Load CA certificate (server's CA) for server verification
	var caCertPool *x509.CertPool
	if caCertPath != "" {
		caCert, err := os.ReadFile(caCertPath)
		if err != nil {
			return nil, fmt.Errorf("read CA cert: %w", err)
		}
		caCertPool = x509.NewCertPool()
		if !caCertPool.AppendCertsFromPEM(caCert) {
			return nil, fmt.Errorf("failed to parse CA certificate")
		}
	}

	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      caCertPool,
		MinVersion:   tls.VersionTLS12,
	}

	return tlsConfig, nil
}

// CreateMTLSClient creates an HTTP client with mTLS configured
func (cm *CertManager) CreateMTLSClient(caCertPath string) (*http.Client, error) {
	tlsConfig, err := cm.LoadTLSConfig(caCertPath)
	if err != nil {
		return nil, err
	}

	return &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
		Timeout: 30 * time.Second,
	}, nil
}

// CertsExist checks if agent certificates have been generated
func (cm *CertManager) CertsExist() bool {
	certPath := filepath.Join(cm.certsDir, "agent.crt")
	keyPath := filepath.Join(cm.certsDir, "agent.key")

	if _, err := os.Stat(certPath); err != nil {
		return false
	}
	if _, err := os.Stat(keyPath); err != nil {
		return false
	}
	return true
}

// IsExpiringSoon returns true when the current cert expires within `within`.
// Used to drive auto-rotation: the agent calls this once per heartbeat tick
// and re-issues the cert before TLS handshakes start failing.
//
// The default rotation window in main.go is 30 days — well below the 1-year
// validity, so we get at least a month of grace if scheduling glitches.
func (cm *CertManager) IsExpiringSoon(within time.Duration) bool {
	certPath := filepath.Join(cm.certsDir, "agent.crt")
	pemBytes, err := os.ReadFile(certPath)
	if err != nil {
		return true // missing → treat as expired so we regenerate
	}
	block, _ := pem.Decode(pemBytes)
	if block == nil {
		return true
	}
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return true
	}
	return time.Until(cert.NotAfter) < within
}

// RotateIfNeeded regenerates the cert when it's within `within` of expiry.
// Idempotent — safe to call from a polling loop.
func (cm *CertManager) RotateIfNeeded(agentID, hostname string, within time.Duration) (rotated bool, err error) {
	if !cm.IsExpiringSoon(within) {
		return false, nil
	}
	if err := cm.GenerateAgentCert(agentID, hostname); err != nil {
		return false, fmt.Errorf("rotate cert: %w", err)
	}
	return true, nil
}
