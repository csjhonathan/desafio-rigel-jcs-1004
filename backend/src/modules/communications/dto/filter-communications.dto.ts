import { IsDateString, IsNumberString, IsOptional, IsString } from 'class-validator'

export class FilterCommunicationsDto {
  @IsOptional()
  @IsDateString()
  start_date?: string

  @IsOptional()
  @IsDateString()
  end_date?: string

  @IsOptional()
  @IsString()
  tribunal?: string

  @IsOptional()
  @IsString()
  process_number?: string

  @IsOptional()
  @IsNumberString()
  page?: string

  @IsOptional()
  @IsNumberString()
  limit?: string
}
