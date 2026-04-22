import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  newPassword: string;
}

