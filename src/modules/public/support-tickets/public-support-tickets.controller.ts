import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicSupportTicketsService } from './public-support-tickets.service';
import { CreateGuestTicketDto } from './dto/CreateGuestTicketDto';

@ApiTags('Public Support Tickets')
@Controller({ version: '1', path: 'public/support-tickets' })
export class PublicSupportTicketsController {
  constructor(
    private readonly supportTicketsService: PublicSupportTicketsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a support ticket from guest portal' })
  @ApiResponse({
    status: 201,
    description: 'Ticket created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async createGuestTicket(@Body() dto: CreateGuestTicketDto) {
    const ticket = await this.supportTicketsService.createFromGuest(dto);

    return {
      success: true,
      message: 'Your support ticket has been submitted successfully. We will get back to you soon.',
      data: {
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
      },
    };
  }
}
