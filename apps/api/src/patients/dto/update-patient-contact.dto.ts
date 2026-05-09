import { PartialType } from '@nestjs/swagger';

import { PatientContactDto } from './patient-contact.dto';

export class UpdatePatientContactDto extends PartialType(PatientContactDto) {}
