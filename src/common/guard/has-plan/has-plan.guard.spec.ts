import { HasPlanGuard } from './has-plan.guard';
import { UserRepository } from '../../repository/user/user.repository';

describe('HasPlanGuard', () => {
  it('should be defined', () => {
    expect(new HasPlanGuard({} as UserRepository)).toBeDefined();
  });
});