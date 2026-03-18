import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GuestFlightsService } from './guest-flights.service';
import { CreateGuestFlightDto, UpdateGuestFlightDto } from './dto';
import { JwtGuestGuard } from '../guest-auth/guards/jwt-guest.guard';

@ApiTags('Guest Flights')
@Controller({ version: '1', path: 'public/guest/flights' })
export class GuestFlightsController {
  constructor(private readonly guestFlightsService: GuestFlightsService) {}

  @Get(':bookingUuid')
  @UseGuards(JwtGuestGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get flight details for a booking' })
  @ApiResponse({ status: 200, description: 'Flight details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No flight details found' })
  async getFlightDetails(
    @Param('bookingUuid') bookingUuid: string,
    @Req() req: any,
  ) {
    const guestId = req.guest.id;
    const flight = await this.guestFlightsService.getFlightByBooking(bookingUuid, guestId);

    return {
      success: true,
      message: flight ? 'Flight details retrieved' : 'No flight details saved yet',
      data: flight,
    };
  }

  @Post(':bookingUuid')
  @UseGuards(JwtGuestGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save flight details for a booking' })
  @ApiResponse({ status: 201, description: 'Flight details saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async saveFlightDetails(
    @Param('bookingUuid') bookingUuid: string,
    @Body() dto: CreateGuestFlightDto,
    @Req() req: any,
  ) {
    const guestId = req.guest.id;
    const flight = await this.guestFlightsService.saveFlightDetails(bookingUuid, guestId, dto);

    return {
      success: true,
      message: 'Flight details saved successfully',
      data: flight,
    };
  }

  @Put(':bookingUuid')
  @UseGuards(JwtGuestGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update flight details for a booking' })
  @ApiResponse({ status: 200, description: 'Flight details updated successfully' })
  async updateFlightDetails(
    @Param('bookingUuid') bookingUuid: string,
    @Body() dto: UpdateGuestFlightDto,
    @Req() req: any,
  ) {
    const guestId = req.guest.id;
    const flight = await this.guestFlightsService.saveFlightDetails(bookingUuid, guestId, dto);

    return {
      success: true,
      message: 'Flight details updated successfully',
      data: flight,
    };
  }

  @Delete(':bookingUuid')
  @UseGuards(JwtGuestGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete flight details for a booking' })
  @ApiResponse({ status: 200, description: 'Flight details deleted successfully' })
  async deleteFlightDetails(
    @Param('bookingUuid') bookingUuid: string,
    @Req() req: any,
  ) {
    const guestId = req.guest.id;
    await this.guestFlightsService.deleteFlightDetails(bookingUuid, guestId);

    return {
      success: true,
      message: 'Flight details deleted successfully',
    };
  }
}
