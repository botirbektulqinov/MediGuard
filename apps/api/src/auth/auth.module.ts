import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { OwnershipService } from './ownership.service';
import { PasswordService } from './password.service';

@Global()
@Module({
  imports: [AuditLogModule, JwtModule.register({ global: true }), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    OwnershipService,
  ],
  exports: [
    AuthService,
    PasswordService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    OwnershipService,
  ],
})
export class AuthModule {}
