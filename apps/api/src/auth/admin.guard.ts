import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable,
  ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Request } from 'express';
import { APP_CONFIG, AppConfig } from '../config/config';
import { DatabaseService } from '../database/database.service';

export interface AdminIdentity { id: string; authUserId: string; role: 'OWNER' | 'ADMIN' }
export type AdminRequest = Request & { admin: AdminIdentity };

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly jwks?: ReturnType<typeof createRemoteJWKSet>;
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig, private readonly db: DatabaseService) {
    if (config.supabaseUrl) this.jwks = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json',config.supabaseUrl),
      { timeoutDuration:2000, cooldownDuration:30000, cacheMaxAge:600000 });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const header = request.get('authorization') ?? '';
    const token = header.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i)?.[1];
    if (!token || token.length > 8192) throw new UnauthorizedException();
    if (!this.jwks || !this.config.supabaseUrl || !this.config.supabasePublishableKey) {
      throw new ServiceUnavailableException({code:'AUTH_UNAVAILABLE'});
    }
    let subject: string;
    try {
      const { payload } = await jwtVerify(token,this.jwks,{
        issuer:`${this.config.supabaseUrl}/auth/v1`, audience:'authenticated', algorithms:['ES256','RS256'],
        requiredClaims:['sub','exp','iat','iss','aud','session_id'], clockTolerance:5,
      });
      if (!payload.sub || !isUUID(payload.sub) || !isUUID(String(payload.session_id))
        || payload.role !== 'authenticated' || payload.is_anonymous === true) throw new UnauthorizedException();
      subject = payload.sub;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
      if (/^ERR_(JWT|JWS|JOSE_ALG)/.test(code)
        || ['ERR_JWKS_NO_MATCHING_KEY','ERR_JWKS_MULTIPLE_MATCHING_KEYS'].includes(code)) throw new UnauthorizedException();
      throw new ServiceUnavailableException({code:'AUTH_UNAVAILABLE'});
    }
    // Consulta autoritativa fuera de cualquier transacción: un JWT firmado no basta
    // si el usuario fue eliminado del proveedor de Auth.
    let userResponse:Response;
    try {
      userResponse=await fetch(`${this.config.supabaseUrl}/auth/v1/user`,{
        headers:{Authorization:`Bearer ${token}`,apikey:this.config.supabasePublishableKey},
        redirect:'error',signal:AbortSignal.timeout(2000),
      });
    } catch { throw new ServiceUnavailableException({code:'AUTH_UNAVAILABLE'}); }
    if (userResponse.status===401 || userResponse.status===403) throw new UnauthorizedException();
    if (!userResponse.ok) throw new ServiceUnavailableException({code:'AUTH_UNAVAILABLE'});
    let user:unknown;
    try { user=await userResponse.json(); } catch { throw new ServiceUnavailableException({code:'AUTH_UNAVAILABLE'}); }
    if (typeof user!=='object' || user===null || !('id' in user) || user.id!==subject
      || ('is_anonymous' in user && user.is_anonymous===true)) throw new UnauthorizedException();
    const admin = await this.db.transaction(async client => {
      const result = await client.query<AdminIdentity & { active:boolean }>(
        'SELECT id,auth_user_id AS "authUserId",role,active FROM sorteos.admin_users WHERE auth_user_id=$1',[subject]);
      const row = result.rows[0];
      const allowed = row?.active === true;
      await client.query(`INSERT INTO sorteos.audit_logs(actor_kind,actor_id,action,entity,entity_id,request_id)
        VALUES ($1,$2,$3,'admin_users',$2,$4)`,
      [allowed ? 'ADMIN' : 'GUEST',row?.id ?? subject,allowed ? 'ADMIN_ACCESS_GRANTED' : 'ADMIN_ACCESS_DENIED',
        request.res?.getHeader('X-Request-Id')]);
      return allowed ? row : undefined;
    });
    if (!admin) throw new ForbiddenException();
    request.admin = { id:admin.id, authUserId:admin.authUserId, role:admin.role };
    return true;
  }
}
