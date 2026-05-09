import { BadRequestException, ConflictException } from '@nestjs/common';
import type { AppointmentStatus } from '@prisma/client';

export const PATIENT_CANCEL_DEADLINE_HOURS = 24;

const allowedTransitions = new Map<AppointmentStatus, AppointmentStatus[]>([
  ['BOOKED', ['CONFIRMED', 'ARRIVED', 'CANCELLED', 'NO_SHOW']],
  ['CONFIRMED', ['ARRIVED', 'CANCELLED', 'NO_SHOW']],
  ['ARRIVED', ['IN_QUEUE', 'CANCELLED']],
  ['IN_QUEUE', ['IN_CONSULTATION', 'CANCELLED']],
  ['IN_CONSULTATION', ['LAB_REQUIRED', 'COMPLETED']],
  ['LAB_REQUIRED', ['COMPLETED']],
  ['COMPLETED', []],
  ['CANCELLED', []],
  ['NO_SHOW', []],
]);

export interface ScheduleWindow {
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
}

export function assertAllowedTransition(
  fromStatus: AppointmentStatus,
  toStatus: AppointmentStatus,
): void {
  if (!allowedTransitions.get(fromStatus)?.includes(toStatus)) {
    throw new BadRequestException(
      `Cannot transition appointment from ${fromStatus} to ${toStatus}.`,
    );
  }
}

export function assertPatientCanCancel(startAt: Date, now = new Date()): void {
  const deadlineMs = PATIENT_CANCEL_DEADLINE_HOURS * 60 * 60 * 1000;
  if (startAt.getTime() - now.getTime() < deadlineMs) {
    throw new BadRequestException(
      'Appointments can only be cancelled by patients at least 24 hours before start time.',
    );
  }
}

export function assertWithinDoctorSchedule(
  startAt: Date,
  endAt: Date,
  schedules: ScheduleWindow[],
): void {
  const appointmentDay = startAt.getUTCDay();
  const startMinutes = minutesSinceMidnightUtc(startAt);
  const endMinutes = minutesSinceMidnightUtc(endAt);

  const isInsideSchedule = schedules.some((schedule) => {
    if (schedule.dayOfWeek !== appointmentDay) {
      return false;
    }

    const scheduleStart = parseTime(schedule.startsAt);
    const scheduleEnd = parseTime(schedule.endsAt);
    return startMinutes >= scheduleStart && endMinutes <= scheduleEnd;
  });

  if (!isInsideSchedule) {
    throw new ConflictException('Appointment is outside the doctor schedule.');
  }
}

export function parseTime(value: string): number {
  const [hoursText, minutesText] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new BadRequestException('Schedule time must use HH:mm format.');
  }

  return hours * 60 + minutes;
}

function minutesSinceMidnightUtc(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}
