import { Module } from '@nestjs/common';
import { StrategyController } from './controllers/StrategyController.ts';

@Module({
  imports: [],
  controllers: [StrategyController],
  providers: [],
})
export class AppModule {}
