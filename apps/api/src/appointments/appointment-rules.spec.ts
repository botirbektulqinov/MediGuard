import { BadRequestException, ConflictException } from '@nestjs/common';

import {
  assertAllowedTransition,
  assertPatientCanCancel,
  assertWithinDoctorSchedule,
} from './appointment-rules';

describe('appointment rules', () => {
  it('allows valid queue lifecycle transitions', () => {
    expect(() => assertAllowedTransition('BOOKED', 'CONFIRMED')).not.toThrow();
    expect(() => assertAllowedTransition('ARRIVED', 'IN_QUEUE')).not.toThrow();
    expect(() => assertAllowedTransition('IN_CONSULTATION', 'COMPLETED')).not.toThrow();
  });

  it('rejects invalid lifecycle transitions', () => {
    expect(() => assertAllowedTransition('BOOKED', 'COMPLETED')).toThrow(BadRequestException);
  });

  it('enforces patient cancellation deadline', () => {
    const now = new Date('2026-05-09T09:00:00.000Z');
    expect(() => assertPatientCanCancel(new Date('2026-05-11T10:00:00.000Z'), now)).not.toThrow();
    expect(() => assertPatientCanCancel(new Date('2026-05-09T12:00:00.000Z'), now)).toThrow(
      BadRequestException,
    );
  });

  it('checks appointment placement inside doctor schedule', () => {
    const schedules = [{ dayOfWeek: 1, startsAt: '09:00', endsAt: '17:00' }];

    expect(() =>
      assertWithinDoctorSchedule(
        new Date('2026-05-11T10:00:00.000Z'),
        new Date('2026-05-11T10:30:00.000Z'),
        schedules,
      ),
    ).not.toThrow();

    expect(() =>
      assertWithinDoctorSchedule(
        new Date('2026-05-11T18:00:00.000Z'),
        new Date('2026-05-11T18:30:00.000Z'),
        schedules,
      ),
    ).toThrow(ConflictException);
  });
});
