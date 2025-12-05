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
import { CreateCourtDto, UpdateCourtDto, FilterCourtsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  /**
   * Create a new court (Admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateCourtDto) {
    return this.courtsService.create(dto);
  }

  /**
   * Get all courts
   */
  @Get()
  async findAll(@Query() filters?: FilterCourtsDto) {
    return this.courtsService.findAll(filters);
  }

  /**
   * Get court by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.courtsService.findById(Number(id));
  }

  /**
   * Get available time slots for a court on a specific date
   */
  @Get(':id/available-slots')
  async getAvailableSlots(
    @Param('id') id: string,
    @Query('date') date: string,
  ) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return { error: 'Invalid date format. Use ISO format: YYYY-MM-DD' };
    }

    return this.courtsService.getAvailableSlots(Number(id), parsedDate);
  }

  /**
   * Get court with pricing for specific time slot
   */
  @Get(':id/pricing')
  async getCourtWithPrice(
    @Param('id') id: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.courtsService.getCourtWithPrice(
      Number(id),
      new Date(startTime),
      new Date(endTime),
    );
  }

  /**
   * Check if court is available for time slot
   */
  @Get(':id/is-available')
  async isAvailable(
    @Param('id') id: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    const available = await this.courtsService.isAvailable(
      Number(id),
      new Date(startTime),
      new Date(endTime),
    );

    return { available };
  }

  /**
   * Update court (Admin only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateCourtDto) {
    return this.courtsService.update(Number(id), dto);
  }

  /**
   * Delete court (Admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.courtsService.delete(Number(id));
  }
}
