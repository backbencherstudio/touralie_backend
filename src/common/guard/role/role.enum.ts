export enum Role {
  SU_ADMIN = 'su_admin',
  ADMIN = 'admin',
  USER = 'user',
  PRACTITIONER = 'practitioner',
}

export const ADMIN_ACCESS_ROLES = [Role.SU_ADMIN, Role.ADMIN];
