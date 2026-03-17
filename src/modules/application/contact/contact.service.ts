import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { PrismaService } from '../../../prisma/prisma.service';

import { ActivityRepository } from 'src/common/repository/activity/activity.repository';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private activityRepository: ActivityRepository,
  ) {}

  async create(createContactDto: CreateContactDto) {
    try {
      const data = {};
      if (createContactDto.first_name) {
        data['first_name'] = createContactDto.first_name;
      }
      if (createContactDto.last_name) {
        data['last_name'] = createContactDto.last_name;
      }
      if (createContactDto.email) {
        data['email'] = createContactDto.email;
      }
      if (createContactDto.phone_number) {
        data['phone_number'] = createContactDto.phone_number;
      }
      if (createContactDto.message) {
        data['message'] = createContactDto.message;
      }

      await this.prisma.contact.create({
        data: data,
      });

      await this.activityRepository.createActivity(
        'New Contact Message',
        `A new contact message has been submitted by "${createContactDto.first_name} ${createContactDto.last_name || ''}" (${createContactDto.email}).`,
      );

      return {
        success: true,
        message: 'Submitted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
