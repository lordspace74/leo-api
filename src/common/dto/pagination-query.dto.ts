import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** JSON:API page-based pagination params: `?page[number]=1&page[size]=20`. */
export class PageParamsDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number?: number;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ type: PageParamsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageParamsDto)
  page?: PageParamsDto;
}
