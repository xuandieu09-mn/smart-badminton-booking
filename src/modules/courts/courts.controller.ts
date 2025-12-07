import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CreateCourtDto, UpdateCourtDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  /**
   * GET /courts
   * Get all courts
   */
  @Get()
  async findAll(@Query('isActive') isActive?: string) {
    const active =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.courtsService.findAll(active);
  }

  /**
   * GET /courts/:id
   * Get court by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.courtsService.findById(Number(id));
  }

  /**
   * GET /courts/:id/availability?date=2025-12-07
   * Get court availability with time slots and pricing for a specific date
   */
  @Get(':id/availability')
  async getAvailability(
    @Param('id') courtId: string,
    @Query('date') date?: string,
  ) {
    if (!date) {
      const today = new Date().toISOString().split('T')[0];
      return this.courtsService.getCourtAvailability(Number(courtId), today);
    }
    return this.courtsService.getCourtAvailability(Number(courtId), date);
  }

  /**
   * POST /courts
   * Create a new court (Admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateCourtDto) {
    return this.courtsService.create(dto);
  }

  /**
   * PUT /courts/:id
   * Update court (Admin only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateCourtDto) {
    return this.courtsService.update(Number(id), dto);
  }

  /**
   * DELETE /courts/:id
   * Delete court (Admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.courtsService.delete(Number(id));
  }
}
