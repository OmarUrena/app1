import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { AdminIdentity } from '../auth/admin.guard';
import { AdminPageQueryDto, AdminRaffleDto, AvailabilityDto, CreateRaffleDto, PageQueryDto,
  PatchRaffleDto, PublicBankAccountDto, RaffleDetailDto, RaffleMediaInputDto, RaffleStatus } from './catalog.dto';
import { MediaService } from './media.service';
import { APP_CONFIG, AppConfig } from '../config/config';
import { developmentToken } from '../development/capability';

interface RaffleRow {
  id:string; slug:string; title:string; description:string; prize:string; total_tickets:number;
  ticket_width:number; ticket_price_minor:string; min_purchase:number; max_purchase:number;
  rules:string; rules_version:string; starts_at:Date|null; ends_at:Date|null; status:RaffleStatus; version:number;
}
type MediaRow = {storage_key:string;alt:string;rights_confirmed:boolean};

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService, private readonly media: MediaService,@Inject(APP_CONFIG) private readonly config:AppConfig) {}

  private async counts(client: PoolClient, id:string): Promise<AvailabilityDto> {
    const result = await client.query<{total:number;available:number;held:number;reserved:number;sold:number;asOf:Date}>(`
      SELECT count(*)::int AS total,
      count(*) FILTER (WHERE t.status='AVAILABLE' OR (t.status='HELD' AND
        (h.status <> 'ACTIVE' OR h.expires_at <= now())))::int AS available,
      count(*) FILTER (WHERE t.status='HELD' AND h.status='ACTIVE' AND h.expires_at>now())::int AS held,
      count(*) FILTER (WHERE t.status='RESERVED')::int AS reserved,
      count(*) FILTER (WHERE t.status='SOLD')::int AS sold, now() AS "asOf"
      FROM sorteos.tickets t LEFT JOIN sorteos.checkout_holds h ON h.id=t.hold_id WHERE t.raffle_id=$1`,[id]);
    const row = result.rows[0]!;
    return {...row,asOf:row.asOf.toISOString()};
  }

  private async row(client:PoolClient,id:string,bySlug=false,publicOnly=false,lock=false): Promise<RaffleRow> {
    const result = await client.query<RaffleRow>(`SELECT * FROM sorteos.raffles WHERE ${bySlug?'slug':'id'}=$1
      ${publicOnly ? "AND status='PUBLISHED'" : ''} ${lock?'FOR UPDATE':''}`,[id]);
    if (!result.rows[0]) throw new NotFoundException();
    return result.rows[0];
  }

  private async map(client:PoolClient,row:RaffleRow,admin=false): Promise<AdminRaffleDto> {
    const images = (await client.query<MediaRow>('SELECT storage_key,alt,rights_confirmed FROM sorteos.raffle_media WHERE raffle_id=$1 ORDER BY position',[row.id])).rows;
    const counts = await this.counts(client,row.id);
    const price = Number(row.ticket_price_minor);
    if (!Number.isSafeInteger(price)) throw new Error('Moneda fuera de rango');
    const dto: RaffleDetailDto = {
      id:row.id,slug:row.slug,title:row.title,description:row.description,prize:row.prize,status:row.status,
      totalTickets:row.total_tickets,numberWidth:row.ticket_width,ticketPriceMinor:price,
      minPurchase:row.min_purchase,maxPurchase:row.max_purchase,rules:row.rules,rulesVersion:row.rules_version,
      startsAt:row.starts_at?.toISOString()??null,endsAt:row.ends_at?.toISOString()??null,
      images:images.map(image=>({url:this.media.url(image.storage_key),alt:image.alt})),
      prizeImageUrl:images[0]?this.media.url(images[0].storage_key):null,
      confirmedSoldCount:counts.sold,reservedCount:counts.reserved,availableCount:counts.available,
    };
    if (!admin) return dto as AdminRaffleDto;
    const commitments = await client.query<{exists:boolean}>('SELECT EXISTS(SELECT 1 FROM sorteos.checkout_holds WHERE raffle_id=$1)',[row.id]);
    return {...dto,version:row.version,media:images.map(image=>({storageKey:image.storage_key,alt:image.alt,
      rightsConfirmed:image.rights_confirmed})),hasCommitments:commitments.rows[0]!.exists};
  }

  async list(query:PageQueryDto,admin=false) {
    return this.db.transaction(async client=>{
      const status = admin ? (query as AdminPageQueryDto).status??null : 'PUBLISHED';
      const total = await client.query<{total:number}>('SELECT count(*)::int AS total FROM sorteos.raffles WHERE ($1::text IS NULL OR status::text=$1)',[status]);
      const result = await client.query<RaffleRow>(`SELECT * FROM sorteos.raffles WHERE ($1::text IS NULL OR status::text=$1)
        ORDER BY created_at DESC,id LIMIT $2 OFFSET $3`,[status,query.pageSize,(query.page-1)*query.pageSize]);
      const items = [];
      for (const row of result.rows) {
        const full = await this.map(client,row,admin);
        items.push(admin?full:{id:full.id,slug:full.slug,title:full.title,prizeImageUrl:full.prizeImageUrl,
          status:full.status,ticketPriceMinor:full.ticketPriceMinor,totalTickets:full.totalTickets,
          confirmedSoldCount:full.confirmedSoldCount,availableCount:full.availableCount});
      }
      return {items,pagination:{page:query.page,pageSize:query.pageSize,total:total.rows[0]!.total}};
    },true);
  }

  async detail(id:string,admin=false) {
    return this.db.transaction(async client=>this.map(client,await this.row(client,id,!admin,!admin),admin),true);
  }
  async availability(slug:string) {
    return this.db.transaction(async client=>this.counts(client,(await this.row(client,slug,true,true)).id),true);
  }
  async bankAccounts() {
    return this.db.transaction(async client=>{
      let demo=false;const token=developmentToken(this.config);
      if(token){await client.query("SELECT set_config('app.development_mfa_token',$1,true)",[token]);demo=(await client.query<{valid:boolean}>('SELECT sorteos.development_checkout_valid() AS valid')).rows[0]?.valid===true;}
      return {items:(await client.query<PublicBankAccountDto>(`
      SELECT id,bank_name AS "bankName",account_type AS "accountType",account_display AS "accountDisplay",
      holder_name AS "holderName",currency FROM sorteos.bank_accounts WHERE (active AND NOT is_demo) OR (is_demo AND $1) ORDER BY bank_name,id`,[demo])).rows};},true);
  }

  private validate(input:CreateRaffleDto):void {
    if (input.maxPurchase<input.minPurchase || input.maxPurchase>input.totalTickets
      || BigInt(input.ticketPriceMinor)*BigInt(input.maxPurchase)>BigInt(Number.MAX_SAFE_INTEGER)
      || (input.startsAt && input.endsAt && Date.parse(input.startsAt)>=Date.parse(input.endsAt))) {
      throw new UnprocessableEntityException({code:'INVALID_RAFFLE'});
    }
  }

  private async context(client:PoolClient,actor:AdminIdentity,requestId:string):Promise<void> {
    const current = await client.query('SELECT id FROM sorteos.admin_users WHERE id=$1 AND auth_user_id=$2 AND active AND role=$3',
      [actor.id,actor.authUserId,actor.role]);
    if (!current.rowCount) throw new ForbiddenException();
    await client.query("SELECT set_config('app.actor_kind','ADMIN',true),set_config('app.actor_id',$1,true),set_config('app.request_id',$2,true)",[actor.id,requestId]);
  }
  private async replaceImages(client:PoolClient,id:string,images:RaffleMediaInputDto[]):Promise<void> {
    await client.query('DELETE FROM sorteos.raffle_media WHERE raffle_id=$1',[id]);
    for (const [position,image] of images.entries()) await client.query(`
      INSERT INTO sorteos.raffle_media(raffle_id,storage_key,alt,position,rights_confirmed) VALUES ($1,$2,$3,$4,$5)`,
    [id,image.storageKey,image.alt,position,image.rightsConfirmed]);
  }

  async create(input:CreateRaffleDto,actor:AdminIdentity,requestId:string) {
    this.validate(input);
    return this.db.transaction(async client=>{
      await this.context(client,actor,requestId);
      const result = await client.query<RaffleRow>(`INSERT INTO sorteos.raffles(slug,title,description,prize,total_tickets,
        ticket_price_minor,min_purchase,max_purchase,rules,rules_version,starts_at,ends_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [input.slug,input.title,input.description,input.prize,input.totalTickets,input.ticketPriceMinor,
        input.minPurchase,input.maxPurchase,input.rules,input.rulesVersion,input.startsAt??null,input.endsAt??null]);
      const row = result.rows[0]!;
      await this.replaceImages(client,row.id,input.images??[]);
      return this.map(client,row,true);
    });
  }

  async patch(id:string,input:PatchRaffleDto,actor:AdminIdentity,requestId:string) {
    return this.db.transaction(async client=>{
      await this.context(client,actor,requestId);
      const old = await this.row(client,id,false,false,true);
      if (!['DRAFT','PAUSED'].includes(old.status)) throw new ConflictException({code:'RAFFLE_NOT_EDITABLE'});
      const current = await this.map(client,old,true);
      if ((input.totalTickets!==undefined && input.totalTickets!==old.total_tickets)
        || (input.ticketPriceMinor!==undefined && input.ticketPriceMinor!==current.ticketPriceMinor && current.hasCommitments)) {
        throw new ConflictException({code:'RAFFLE_FIELDS_LOCKED'});
      }
      // Null solo tiene significado en fechas; ningún campo obligatorio admite null.
      for (const [key,value] of Object.entries(input)) if (value===null && !['startsAt','endsAt'].includes(key)) {
        throw new UnprocessableEntityException({code:'INVALID_RAFFLE'});
      }
      const merged:CreateRaffleDto = {...current,...input,images:input.images??current.media};
      this.validate(merged);
      const result = await client.query<RaffleRow>(`UPDATE sorteos.raffles SET slug=$2,title=$3,description=$4,prize=$5,
        ticket_price_minor=$6,min_purchase=$7,max_purchase=$8,rules=$9,rules_version=$10,starts_at=$11,ends_at=$12,
        publication_approved_at=NULL,publication_approved_by=NULL,approved_rules_version=NULL WHERE id=$1 RETURNING *`,
      [id,merged.slug,merged.title,merged.description,merged.prize,merged.ticketPriceMinor,merged.minPurchase,
        merged.maxPurchase,merged.rules,merged.rulesVersion,merged.startsAt,merged.endsAt]);
      if (input.images) await this.replaceImages(client,id,input.images);
      return this.map(client,result.rows[0]!,true);
    });
  }

  async publish(id:string,resume:boolean,actor:AdminIdentity,requestId:string) {
    if (actor.role!=='OWNER') throw new ForbiddenException();
    // HEAD externo con la conexión DB ya liberada; luego se comprueba que no hubo edición.
    const snapshot = await this.detail(id,true);
    if (snapshot.status !== (resume?'PAUSED':'DRAFT')) throw new ConflictException({code:'INVALID_RAFFLE_STATE'});
    if (!snapshot.media.length || snapshot.media.some(image=>!image.rightsConfirmed)) {
      throw new UnprocessableEntityException({code:'PUBLICATION_REQUIREMENTS_NOT_MET'});
    }
    await this.media.verify(snapshot.media.map(image=>image.storageKey));
    return this.db.transaction(async client=>{
      await this.context(client,actor,requestId);
      const row = await this.row(client,id,false,false,true);
      if (row.version!==snapshot.version || row.status!==snapshot.status) throw new ConflictException({code:'CONCURRENT_MODIFICATION'});
      if (row.ends_at && row.ends_at.getTime()<=Date.now()) throw new UnprocessableEntityException({code:'INVALID_RAFFLE'});
      const result = await client.query<RaffleRow>(`UPDATE sorteos.raffles SET status='PUBLISHED',
        published_at=coalesce(published_at,now()),publication_approved_at=now(),publication_approved_by=$2,
        approved_rules_version=rules_version WHERE id=$1 RETURNING *`,[id,actor.id]);
      await client.query(`INSERT INTO sorteos.audit_logs(actor_kind,actor_id,action,entity,entity_id,request_id)
        VALUES ('ADMIN',$1,'PUBLICATION_ATTESTATION','raffles',$2,$3)`,[actor.id,id,requestId]);
      return this.map(client,result.rows[0]!,true);
    });
  }

  async pause(id:string,actor:AdminIdentity,requestId:string) {
    return this.db.transaction(async client=>{
      await this.context(client,actor,requestId);
      const row = await this.row(client,id,false,false,true);
      if (row.status!=='PUBLISHED') throw new ConflictException({code:'INVALID_RAFFLE_STATE'});
      const result = await client.query<RaffleRow>("UPDATE sorteos.raffles SET status='PAUSED' WHERE id=$1 RETURNING *",[id]);
      return this.map(client,result.rows[0]!,true);
    });
  }
}
