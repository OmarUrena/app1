import { ApiProperty, PickType } from '@nestjs/swagger';
import { AvailabilityDto } from '../catalog/catalog.dto';
import { AdminOrdersQueryDto } from '../payments/payments.dto';
export class OrdersCsvQueryDto extends PickType(AdminOrdersQueryDto,['status','raffleId','from','to'] as const) {}
export class OperationSummaryDto extends AvailabilityDto {
  @ApiProperty({description:'Entero decimal en centavos DOP, sin pérdida de precisión.',pattern:'^[0-9]+$'}) confirmedAmountMinor!:string;
  @ApiProperty({pattern:'^[0-9]+$'}) pendingAmountMinor!:string;
  @ApiProperty({type:'integer',minimum:0}) pendingOrders!:number;
  @ApiProperty({type:'integer',minimum:0}) openIncidents!:number;
  @ApiProperty({type:'integer',minimum:0}) activeRaffles!:number;
}
