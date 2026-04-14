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

  @Get('process/:process_number')
  @ApiOperation({ summary: 'Listar comunicações por número de processo' })
  findByProcessNumber(@Param('process_number') process_number: string) {
    return this.communicationsService.findAllByProcessNumber(process_number)
  }

  @Get('tribunals')
  @ApiOperation({ summary: 'Listar tribunais únicos existentes nas comunicações' })
  listUniqueTribunals() {
    return this.communicationsService.listUniqueTribunals()
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
