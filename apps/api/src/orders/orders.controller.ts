import { Body, CallHandler, CanActivate, Controller, ExecutionContext, Get, Headers, HttpException, Inject,
  Injectable, NestInterceptor, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { Request } from 'express';
import { defer, finalize } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../config/config';
import { assertCheckoutOrigin, guestSecret } from '../checkout/guest-access';
import { CheckoutService } from '../checkout/checkout.service';
import { DatabaseService } from '../database/database.service';
import { OrdersService } from './orders.service';
import { OrderDto, SubmitOrderDto } from './orders.dto';
import { ReceiptUpload } from './receipt.service';

@Injectable()
export class OrderUploadGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config:AppConfig,private readonly db:DatabaseService,private readonly checkout:CheckoutService){}
  async canActivate(context:ExecutionContext) {
    const req=context.switchToHttp().getRequest<Request>();assertCheckoutOrigin(req,this.config);
    if(Number(req.headers['content-length'])>this.config.receiptMaxBytes+16384)throw new HttpException({code:'FILE_TOO_LARGE'},413);
    if(!req.is('multipart/form-data'))throw new HttpException({code:'INVALID_REQUEST'},400);
    await this.db.transaction(c=>this.checkout.session(c,guestSecret(req,this.config)),true);
    return true;
  }
}
@Injectable()
export class UploadCapacityInterceptor implements NestInterceptor {
  private active=0;
  intercept(_context:ExecutionContext,next:CallHandler) {
    if(this.active>=4)throw new HttpException({code:'RATE_LIMITED'},429);
    this.active++;
    return defer(()=>next.handle()).pipe(finalize(()=>{this.active--;}));
  }
}
@ApiTags('orders') @ApiCookieAuth('guestSession') @Controller('orders')
export class OrdersController {
  constructor(private readonly orders:OrdersService,@Inject(APP_CONFIG) private readonly config:AppConfig){}
  @Post() @UseGuards(OrderUploadGuard) @UseInterceptors(UploadCapacityInterceptor,FileInterceptor('receipt'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({schema:{type:'object',required:['holdId','customerName','customerPhone','customerEmail','bankAccountId','bankReference','transferDate','acceptedRulesVersion','receipt'],
    additionalProperties:false,properties:{holdId:{type:'string',format:'uuid'},idempotencyKey:{type:'string',format:'uuid'},
      customerName:{type:'string',minLength:2,maxLength:180},customerPhone:{type:'string'},customerEmail:{type:'string',format:'email',maxLength:254},
      bankAccountId:{type:'string',format:'uuid'},bankReference:{type:'string',minLength:1,maxLength:180},transferDate:{type:'string',format:'date-time'},
      acceptedRulesVersion:{type:'string',minLength:1,maxLength:100},receipt:{type:'string',format:'binary',description:'JPG/PNG/PDF, 5 MiB por defecto. Obligatorio.'}}}})
  @ApiHeader({name:'Idempotency-Key',required:false,schema:{type:'string',format:'uuid'},description:'Obligatorio si no se envía idempotencyKey en el multipart.'})
  @ApiHeader({name:'Origin',required:true}) @ApiCreatedResponse({type:OrderDto})
  submit(@Body() body:SubmitOrderDto,@Headers('idempotency-key') header:string|undefined,@UploadedFile() file:ReceiptUpload|undefined,@Req() req:Request) {
    if(header&&body.idempotencyKey&&header.toLowerCase()!==body.idempotencyKey.toLowerCase())throw new HttpException({code:'INVALID_REQUEST'},400);
    const key=header??body.idempotencyKey;
    if(!key||!isUUID(key))throw new HttpException({code:'INVALID_REQUEST'},400);
    return this.orders.submit(body,key,guestSecret(req,this.config),file,String(req.res?.getHeader('X-Request-Id')));
  }
  @Get(':code') @ApiOkResponse({type:OrderDto})
  get(@Param('code') code:string,@Req() req:Request) {
    if(!/^RF-[A-Z0-9]{16,64}$/.test(code))throw new HttpException({code:'NOT_FOUND'},404);
    return this.orders.get(code,guestSecret(req,this.config),String(req.res?.getHeader('X-Request-Id')));
  }
}
