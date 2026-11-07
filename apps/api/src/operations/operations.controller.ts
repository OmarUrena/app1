import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminGuard, AdminRequest } from '../auth/admin.guard';
import { FinancialGuard } from '../auth/financial.guard';
import { ReviewDto } from '../payments/payments.dto';
import { AdminRaffleDto } from '../catalog/catalog.dto';
import { CatalogService } from '../catalog/catalog.service';
import { OperationSummaryDto, OrdersCsvQueryDto } from './operations.dto';
import { OperationsService } from './operations.service';
@ApiTags('admin-operations') @ApiBearerAuth() @UseGuards(AdminGuard,FinancialGuard) @Controller('admin')
export class OperationsController {
  constructor(private readonly operations:OperationsService,private readonly catalog:CatalogService){}
  private rid(req:AdminRequest){return String(req.res?.getHeader('X-Request-Id'));}
  @Get('dashboard') @ApiOkResponse({type:OperationSummaryDto})
  dashboard(@Req() req:AdminRequest){return this.operations.summary(undefined,req.admin,req.adminProof,this.rid(req));}
  @Get('raffles/:id/summary') @ApiOkResponse({type:OperationSummaryDto})
  summary(@Param('id',new ParseUUIDPipe()) id:string,@Req() req:AdminRequest){return this.operations.summary(id,req.admin,req.adminProof,this.rid(req));}
  @Post('raffles/:id/close') @HttpCode(200) @ApiOkResponse({type:AdminRaffleDto})
  async close(@Param('id',new ParseUUIDPipe()) id:string,@Body() body:ReviewDto,@Req() req:AdminRequest){
    await this.operations.close(id,body.expectedVersion,req.admin,req.adminProof,this.rid(req));return this.catalog.detail(id,true);
  }
  @Get('reports/orders.csv') @ApiProduces('text/csv') @ApiOkResponse({schema:{type:'string',format:'binary'},description:'CSV sin datos de comprador, máximo 10000 órdenes. Solo OWNER. Descarga auditada.'})
  async csv(@Query() query:OrdersCsvQueryDto,@Req() req:AdminRequest,@Res() res:Response){
    const csv=await this.operations.csv(query,req.admin,req.adminProof,this.rid(req));
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Disposition','attachment; filename="ordenes.csv"');res.type('text/csv; charset=utf-8').send(csv);
  }
}
