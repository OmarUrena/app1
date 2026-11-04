import { CanActivate, ExecutionContext, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { AdminIdentity, AdminProof, AdminRequest } from './admin.guard';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class FinancialAuthorization {
  constructor(private readonly db:DatabaseService){}
  async authorize(c:PoolClient,admin:AdminIdentity,proof:AdminProof,requestId:string) {
    const now=Math.floor(Date.now()/1000);
    if(proof.aal!=='aal2'||proof.mfaAt<now-900||proof.mfaAt>now+5)throw new ForbiddenException({code:'MFA_REQUIRED'});
    await c.query(`SELECT set_config('app.actor_kind','ADMIN',true),set_config('app.actor_id',$1,true),
      set_config('app.auth_user_id',$2,true),set_config('app.auth_session_id',$3,true),
      set_config('app.mfa_verified_at',$4,true),set_config('app.request_id',$5,true)`,
      [admin.id,admin.authUserId,proof.sessionId,String(proof.mfaAt),requestId]);
    try{await c.query('SELECT sorteos.assert_financial_admin()');}
    catch(error){
      const code=typeof error==='object'&&error!==null&&'code'in error?String(error.code):'';
      if(code==='P0501')throw new ForbiddenException({code:'ADMIN_ACCESS_REVOKED'});
      if(code==='P0502')throw new UnauthorizedException({code:'SESSION_REVOKED'});
      if(code==='P0503')throw new ForbiddenException({code:'MFA_REQUIRED'});
      throw new ServiceUnavailableException({code:'AUTH_UNAVAILABLE'});
    }
  }
  async check(admin:AdminIdentity,proof:AdminProof,requestId:string){
    await this.db.transaction(c=>this.authorize(c,admin,proof,requestId));
  }
}
@Injectable()
export class FinancialGuard implements CanActivate {
  constructor(private readonly auth:FinancialAuthorization){}
  async canActivate(context:ExecutionContext) {
    const req=context.switchToHttp().getRequest<AdminRequest>();
    await this.auth.check(req.admin,req.adminProof,String(req.res?.getHeader('X-Request-Id')));return true;
  }
}
