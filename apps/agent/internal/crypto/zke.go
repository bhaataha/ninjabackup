package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"

	"golang.org/x/crypto/argon2"
)

// ZeroKnowledgeKeyManager handles client-side encryption keys
// The server never sees the raw DEK — only the encrypted wrapper
type ZeroKnowledgeKeyManager struct{}

// NewKeyManager creates a new zero-knowledge key manager
func NewKeyManager() *ZeroKnowledgeKeyManager {
	return &ZeroKnowledgeKeyManager{}
}

// GenerateDEK creates a new Data Encryption Key (256-bit AES key)
func (km *ZeroKnowledgeKeyManager) GenerateDEK() ([]byte, error) {
	dek := make([]byte, 32) // 256-bit key
	if _, err := io.ReadFull(rand.Reader, dek); err != nil {
		return nil, fmt.Errorf("generate DEK: %w", err)
	}
	return dek, nil
}

// DeriveKEK derives a Key Encryption Key from the user's passphrase using Argon2id
// This KEK is used to wrap/unwrap the DEK
// The KEK never leaves the client
func (km *ZeroKnowledgeKeyManager) DeriveKEK(passphrase string, salt []byte) []byte {
	return argon2.IDKey(
		[]byte(passphrase),
		salt,
		3,           // iterations
		64*1024,     // memory (64 MB)
		4,           // parallelism
		32,          // key size (256-bit)
	)
}

// GenerateSalt creates a cryptographic salt for key derivation
func (km *ZeroKnowledgeKeyManager) GenerateSalt() ([]byte, error) {
	salt := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return nil, fmt.Errorf("generate salt: %w", err)
	}
	return salt, nil
}

// WrapDEK encrypts the DEK using the KEK (AES-256-GCM)
// The wrapped DEK can be safely stored on the server
func (km *ZeroKnowledgeKeyManager) WrapDEK(dek, kek []byte) ([]byte, error) {
	block, err := aes.NewCipher(kek)
	if err != nil {
		return nil, fmt.Errorf("create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("generate nonce: %w", err)
	}

	// nonce is prepended to the ciphertext
	return gcm.Seal(nonce, nonce, dek, nil), nil
}

// UnwrapDEK decrypts the DEK using the KEK
func (km *ZeroKnowledgeKeyManager) UnwrapDEK(wrappedDEK, kek []byte) ([]byte, error) {
	block, err := aes.NewCipher(kek)
	if err != nil {
		return nil, fmt.Errorf("create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(wrappedDEK) < nonceSize {
		return nil, fmt.Errorf("wrapped DEK too short")
	}

	nonce, ciphertext := wrappedDEK[:nonceSize], wrappedDEK[nonceSize:]
	dek, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("unwrap DEK (wrong passphrase?): %w", err)
	}

	return dek, nil
}

// DEKFingerprint returns a SHA-256 fingerprint of the DEK for verification
// This allows the server to verify the DEK without knowing it
func (km *ZeroKnowledgeKeyManager) DEKFingerprint(dek []byte) string {
	hash := sha256.Sum256(dek)
	return hex.EncodeToString(hash[:])
}

// SetupZeroKnowledge performs the initial ZKE setup:
// 1. Generate DEK
// 2. Derive KEK from passphrase
// 3. Wrap DEK with KEK
// 4. Return wrapped DEK + salt (to be stored on server)
func (km *ZeroKnowledgeKeyManager) SetupZeroKnowledge(passphrase string) (wrappedDEK, salt []byte, fingerprint string, err error) {
	// Generate DEK
	dek, err := km.GenerateDEK()
	if err != nil {
		return nil, nil, "", err
	}

	// Generate salt
	salt, err = km.GenerateSalt()
	if err != nil {
		return nil, nil, "", err
	}

	// Derive KEK from passphrase + salt
	kek := km.DeriveKEK(passphrase, salt)

	// Wrap DEK with KEK
	wrappedDEK, err = km.WrapDEK(dek, kek)
	if err != nil {
		return nil, nil, "", err
	}

	// Fingerprint for verification
	fingerprint = km.DEKFingerprint(dek)

	return wrappedDEK, salt, fingerprint, nil
}

// RecoverDEK recovers the DEK from a wrapped DEK using the passphrase
func (km *ZeroKnowledgeKeyManager) RecoverDEK(passphrase string, wrappedDEK, salt []byte) ([]byte, error) {
	kek := km.DeriveKEK(passphrase, salt)
	return km.UnwrapDEK(wrappedDEK, kek)
}
