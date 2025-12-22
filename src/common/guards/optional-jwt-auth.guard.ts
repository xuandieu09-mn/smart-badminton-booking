import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 🔓 Optional JWT Auth Guard
 * - Nếu có token hợp lệ → req.user được set
 * - Nếu không có token hoặc token không hợp lệ → req.user = undefined (không throw error)
 *
 * Dùng cho các endpoint mà:
 * - Người chưa đăng nhập vẫn có thể truy cập
 * - Nhưng nếu đăng nhập thì có thêm features
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Override canActivate để không throw error khi không có token
   */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Override handleRequest để không throw error khi authentication fail
   * - Nếu có user → trả về user
   * - Nếu không có user → trả về null (thay vì throw error)
   */
  handleRequest(err: any, user: any, info: any) {
    // Không throw error, chỉ trả về user hoặc null
    return user || null;
  }
}
