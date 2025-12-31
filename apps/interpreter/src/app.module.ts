import { Module } from '@nestjs/common';
import { StrategyController } from './controllers/StrategyController.js';

@Module({
  imports: [],
  controllers: [StrategyController],
  providers: [],
})
export class AppModule {}
