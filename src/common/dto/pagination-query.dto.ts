import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';

/** JSON:API page-based pagination params: `?page[number]=1&page[size]=20`. */
export class PageParamsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}

export class PaginationQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PageParamsDto)
  page?: PageParamsDto;
}
