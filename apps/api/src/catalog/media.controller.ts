import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminGuard, AdminRequest } from '../auth/admin.guard';
import { FinancialAuthorization, FinancialGuard } from '../auth/financial.guard';
import { DatabaseService } from '../database/database.service';
import { MediaService, PrizeUpload } from './media.service';
export class MediaUploadDto {
  @ApiProperty() storageKey!:string;
  @ApiProperty({format:'uri'}) url!:string;
}
@ApiTags('admin-media') @Controller()
export class MediaController {
  constructor(private readonly media:MediaService,private readonly db:DatabaseService,private readonly auth:FinancialAuthorization){}
  @Post('admin/media') @ApiBearerAuth() @UseGuards(AdminGuard,FinancialGuard)
  @UseInterceptors(FileInterceptor('image',{limits:{fileSize:5*1024*1024,files:1,fields:0,parts:1}}))
  @ApiConsumes('multipart/form-data') @ApiBody({schema:{type:'object',required:['image'],properties:{image:{type:'string',format:'binary'}}}}) @ApiCreatedResponse({type:MediaUploadDto})
  async upload(@UploadedFile() file:PrizeUpload|undefined,@Req() req:AdminRequest){
    const result=await this.media.upload(file);
    try{
      await this.db.transaction(async c=>{
        const rid=String(req.res?.getHeader('X-Request-Id'));await this.auth.authorize(c,req.admin,req.adminProof,rid);
        await c.query(`INSERT INTO sorteos.audit_logs(actor_kind,actor_id,action,entity,entity_id,request_id,metadata)
          VALUES('ADMIN',$1,'PRIZE_IMAGE_UPLOADED','raffle_media',$1,$2,$3::jsonb)`,[req.admin.id,rid,JSON.stringify({storageKey:result.storageKey})]);
      });
      return result;
    }catch(error){await this.media.remove(result.storageKey).catch(()=>undefined);throw error;}
  }
  @Get('media/:id')
  async local(@Param('id',new ParseUUIDPipe()) id:string,@Res() res:Response){
    try{const bytes=await this.media.localRead(id);res.setHeader('Cache-Control','public, max-age=3600');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');res.setHeader('X-Content-Type-Options','nosniff');res.type('image/webp').send(bytes);}
    catch{throw new NotFoundException();}
  }
}
