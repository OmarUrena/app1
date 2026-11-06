import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { AdminIdentity, AdminProof, AdminRequest } from './admin.guard';
import { DatabaseService } from '../database/database.service';
import { APP_CONFIG, AppConfig } from '../config/config';

@Injectable()
export class FinancialAuthorization {
  constructor(private readonly db:DatabaseService,@Inject(APP_CONFIG) private readonly config:AppConfig){}
  private developmentActive(){
    return ['development','test'].includes(this.config.environment)&&this.config.developmentMfaToken
      &&Date.parse(this.config.developmentMfaUntil??'')>Date.now();
  }
  private context(c:PoolClient,admin:AdminIdentity,proof:AdminProof,requestId:string){
    return c.query(`SELECT set_config('app.actor_kind','ADMIN',true),set_config('app.actor_id',$1,true),
      set_config('app.auth_user_id',$2,true),set_config('app.auth_session_id',$3,true),
      set_config('app.mfa_verified_at',$4,true),set_config('app.request_id',$5,true),
      set_config('app.development_mfa_token',$6,true)`,
      [admin.id,admin.authUserId,proof.sessionId,String(proof.mfaAt),requestId,this.developmentActive()?this.config.developmentMfaToken:'']);
  }
  async developmentAccess(admin:AdminIdentity,proof:AdminProof,requestId:string):Promise<string|null>{
    if(!this.developmentActive())return null;
    return this.db.transaction(async c=>{
      await this.context(c,admin,proof,requestId);
      const result=await c.query<{allowed:boolean}>('SELECT sorteos.development_mfa_access_valid() AS allowed');
      return result.rows[0]?.allowed?this.config.developmentMfaUntil!:null;
    });
  }
  async authorize(c:PoolClient,admin:AdminIdentity,proof:AdminProof,requestId:string) {
    const now=Math.floor(Date.now()/1000);
    if((proof.aal!=='aal2'||proof.mfaAt<now-900||proof.mfaAt>now+5)&&!this.developmentActive())throw new ForbiddenException({code:'MFA_REQUIRED'});
    await this.context(c,admin,proof,requestId);
    if(this.developmentActive()){
      const live=await c.query<{valid:boolean}>('SELECT sorteos.admin_auth_session_valid(false) AS valid');
      if(!live.rows[0]?.valid)throw new UnauthorizedException({code:'SESSION_REVOKED'});
    }
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
