import { Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CommunicationsService } from './communications.service'
import { FilterCommunicationsDto } from './dto/filter-communications.dto'

@ApiTags('communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar comunicações com filtros e paginação' })
  findAll(@Query() filters: FilterCommunicationsDto) {
    return this.communicationsService.findAll(filters)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar comunicação por ID' })
  findById(@Param('id') id: string) {
    return this.communicationsService.findById(id)
  }

  @Post(':id/ai-summary')
  @ApiOperation({ summary: 'Gerar resumo por IA para a comunicação' })
  generateAiSummary(@Param('id') id: string) {
    return this.communicationsService.generateAiSummary(id)
  }
}
