import { IsString, IsObject, IsIn } from 'class-validator';

export class CreateSiteIntegrationDto {
  @IsString()
  siteId: string;

  // pms | bms | access_control | vms | webhook — see IntegrationAdapter pattern in spec
  @IsIn(['pms', 'bms', 'access_control', 'vms', 'webhook'])
  type: string;

  @IsObject()
  config: Record<string, any>;
}
