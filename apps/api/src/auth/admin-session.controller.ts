import { Controller, Get, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminGuard, AdminRequest } from './admin.guard';
import { FinancialAuthorization } from './financial.guard';
import { DatabaseService } from '../database/database.service';

export class AdminSessionDto {
  @ApiProperty({format:'uuid'}) adminId!:string;
  @ApiProperty({enum:['OWNER','ADMIN']}) role!:'OWNER'|'ADMIN';
  @ApiProperty() mfaRequired!:boolean;
  @ApiProperty({type:String,nullable:true,format:'date-time'}) mfaVerifiedUntil!:string|null;
}

@ApiTags('admin-auth') @ApiBearerAuth() @UseGuards(AdminGuard) @Controller('admin')
export class AdminSessionController {
  constructor(private readonly db:DatabaseService,private readonly financial:FinancialAuthorization){}
  @Get('session') @ApiOkResponse({type:AdminSessionDto})
  async session(@Req() req:AdminRequest,@Res({passthrough:true}) res:Response):Promise<AdminSessionDto>{
    res.setHeader('Cache-Control','no-store');
    // Allow AAL1 only for MFA setup. Verify session existence without reading Auth secrets.
    await this.db.transaction(async c=>{
      await c.query("SELECT set_config('app.auth_user_id',$1,true),set_config('app.auth_session_id',$2,true)",
        [req.admin.authUserId,req.adminProof.sessionId]);
      const session=await c.query(`SELECT id FROM auth.sessions WHERE id=$1 AND user_id=$2
        AND (not_after IS NULL OR not_after>now())`,[req.adminProof.sessionId,req.admin.authUserId]);
      if(!session.rowCount)throw new UnauthorizedException({code:'SESSION_REVOKED'});
    });
    const proof=req.adminProof,now=Math.floor(Date.now()/1000);
    const mfaRequired=proof.aal!=='aal2'||proof.mfaAt<now-900||proof.mfaAt>now+5;
    if(!mfaRequired)await this.financial.check(req.admin,proof,String(res.getHeader('X-Request-Id')));
    return {adminId:req.admin.id,role:req.admin.role,mfaRequired,
      mfaVerifiedUntil:mfaRequired?null:new Date((proof.mfaAt+900)*1000).toISOString()};
  }
}
