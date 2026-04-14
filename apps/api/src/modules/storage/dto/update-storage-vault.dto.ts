import { PartialType } from '@nestjs/swagger';
import { CreateStorageVaultDto } from './create-storage-vault.dto';

export class UpdateStorageVaultDto extends PartialType(CreateStorageVaultDto) {}
