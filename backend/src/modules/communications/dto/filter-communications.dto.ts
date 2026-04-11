import { IsDateString, IsNumberString, IsOptional, IsString, Matches } from 'class-validator'

const YMD = /^\d{4}-\d{2}-\d{2}$/

export class FilterCommunicationsDto {
  @IsOptional()
  @Matches(YMD, { message: 'start_date deve ser YYYY-MM-DD (dia civil, fuso Brasília no filtro)' })
  @IsDateString()
  start_date?: string

  @IsOptional()
  @Matches(YMD, { message: 'end_date deve ser YYYY-MM-DD (dia civil, fuso Brasília no filtro)' })
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
