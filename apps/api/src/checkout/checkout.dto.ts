import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreateHoldDto {
  @ApiProperty({format:'uuid'}) @IsUUID() raffleId!:string;
  @ApiProperty({type:'integer',minimum:1,maximum:1000}) @IsInt() @Min(1) @Max(1000) quantity!:number;
}
export class GuestSessionDto {
  @ApiProperty() ready!:boolean;
}
export class HoldDto {
  @ApiProperty({format:'uuid'}) holdId!:string;
  @ApiProperty({format:'uuid'}) raffleId!:string;
  @ApiProperty({type:'integer'}) quantity!:number;
  @ApiProperty({type:'integer',format:'int64'}) unitPriceMinor!:number;
  @ApiProperty({type:'integer',format:'int64'}) totalMinor!:number;
  @ApiProperty({enum:['DOP']}) currency!:'DOP';
  @ApiProperty({format:'date-time'}) expiresAt!:string;
  @ApiProperty({format:'date-time'}) serverTime!:string;
  @ApiProperty({enum:['ACTIVE','EXPIRED','CANCELLED','CONSUMED']}) status!:string;
}
