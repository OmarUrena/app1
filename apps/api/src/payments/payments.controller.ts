import { Body, Controller, Get, Headers, HttpCode, HttpException, Param, ParseUUIDPipe, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { Response } from 'express';
import { AdminGuard, AdminRequest } from '../auth/admin.guard';
import { FinancialGuard } from '../auth/financial.guard';
import { PaymentsService } from './payments.service';
import { AdminOrderDetailDto, AdminOrdersPageDto, AdminOrdersQueryDto, ApproveDto, CancelDto, FinancialResultDto, ReceiptProxyDto, ResolutionDto, ReviewDto } from './payments.dto';

@ApiTags('admin-payments') @ApiBearerAuth() @UseGuards(AdminGuard,FinancialGuard) @Controller('admin')
export class PaymentsController {
  constructor(private readonly payments:PaymentsService){}
  private requestId(req:AdminRequest){return String(req.res?.getHeader('X-Request-Id'));}
  private key(key:string){if(!key||!isUUID(key))throw new HttpException({code:'INVALID_REQUEST'},400);return key;}
  @Get('orders') @ApiOkResponse({type:AdminOrdersPageDto})
  list(@Query() query:AdminOrdersQueryDto,@Req() req:AdminRequest){return this.payments.list(query,req.admin,req.adminProof,this.requestId(req));}
  @Get('orders/:id') @ApiOkResponse({type:AdminOrderDetailDto})
  detail(@Param('id',new ParseUUIDPipe()) id:string,@Req() req:AdminRequest){return this.payments.detail(id,req.admin,req.adminProof,this.requestId(req));}
  @Get('payment-reports/:id/receipt-url') @ApiOkResponse({type:ReceiptProxyDto})
  descriptor(@Param('id',new ParseUUIDPipe()) id:string,@Req() req:AdminRequest){return this.payments.receipt(id,req.admin,req.adminProof,this.requestId(req));}
  @Get('payment-reports/:id/receipt') @ApiProduces('image/jpeg','image/png','application/pdf')
  @ApiOkResponse({description:'Comprobante privado descargado por proxy autenticado; nunca URL pública.',schema:{type:'string',format:'binary'}})
  async receipt(@Param('id',new ParseUUIDPipe()) id:string,@Req() req:AdminRequest,@Res() res:Response) {
    const file=await this.payments.receipt(id,req.admin,req.adminProof,this.requestId(req),true);
    if(!('bytes'in file))throw new Error('Invalid receipt response');
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Disposition',`attachment; filename="comprobante.${file.extension}"`);
    res.type(file.mime).send(file.bytes);
  }
  @Post('orders/:id/start-review') @HttpCode(200) @ApiOkResponse({type:FinancialResultDto})
  @ApiHeader({name:'Idempotency-Key',required:true,schema:{type:'string',format:'uuid'}})
  start(@Param('id',new ParseUUIDPipe()) id:string,@Body() body:ReviewDto,@Headers('idempotency-key') key:string,@Req() req:AdminRequest){
    return this.payments.mutate(id,'START_REVIEW',body,this.key(key),req.admin,req.adminProof,this.requestId(req));
  }
  @Post('orders/:id/approve') @HttpCode(200) @ApiOkResponse({type:FinancialResultDto})
  @ApiHeader({name:'Idempotency-Key',required:true,schema:{type:'string',format:'uuid'}})
  approve(@Param('id',new ParseUUIDPipe()) id:string,@Body() body:ApproveDto,@Headers('idempotency-key') key:string,@Req() req:AdminRequest){
    return this.payments.mutate(id,'APPROVE',body,this.key(key),req.admin,req.adminProof,this.requestId(req));
  }
  @Post('orders/:id/request-resolution') @HttpCode(200) @ApiOkResponse({type:FinancialResultDto})
  @ApiHeader({name:'Idempotency-Key',required:true,schema:{type:'string',format:'uuid'}})
  resolution(@Param('id',new ParseUUIDPipe()) id:string,@Body() body:ResolutionDto,@Headers('idempotency-key') key:string,@Req() req:AdminRequest){
    return this.payments.mutate(id,'REQUEST_RESOLUTION',body,this.key(key),req.admin,req.adminProof,this.requestId(req));
  }
  @Post('orders/:id/cancel') @HttpCode(200) @ApiOkResponse({type:FinancialResultDto})
  @ApiHeader({name:'Idempotency-Key',required:true,schema:{type:'string',format:'uuid'}})
  cancel(@Param('id',new ParseUUIDPipe()) id:string,@Body() body:CancelDto,@Headers('idempotency-key') key:string,@Req() req:AdminRequest){
    return this.payments.mutate(id,'CANCEL',body,this.key(key),req.admin,req.adminProof,this.requestId(req));
  }
}
