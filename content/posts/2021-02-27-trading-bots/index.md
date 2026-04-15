---
title: Comparison of Trading Bots
date: 2021-02-27
tags: ["crypto","algotrading","python"]
---

I'm going to compare my initial experiences with various trading bots I've found. I'll be looking at:

- [Jesse](https://github.com/jesse-ai/jesse)
- [HummingBot](https://github.com/CoinAlpha/hummingbot)
- [CryptoSignal](https://github.com/CryptoSignal/Crypto-Signal)

All of these are Python based projects. Python seems to be the standard language for algotrading and data science in general. A lot of analysis can be done easily in [Jupyter Notebooks](https://jupyter.org/), which I actually used recently for the first time and really enjoy working with. FWIW I've been using the [VSCode addon](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter) and it's been a great experience. Google also offers their [Colaboratory](https://colab.research.google.com) which let you run notebooks for free with access to GPUs.

## Jesse

Jesse provides a straightforward framework for developing strategies and backtesting them over historical data.

Several Docker containers are available with the database, extra tools for generating backtest reports, and an example strategy ready to run. Available [here](https://github.com/jesse-ai/jesse-stack-docker). And their documentation is available [here](https://docs.jesse.trade).

One big issue with Jesse out of the box is that their live-trading module is not  available yet. The last update said it should be out sometime early 2021, but until it actually releases Jesse is just a backtesting tool.

Your strategy inherits from their `Strategy` class and implements certain functions such as `def should_long(self)`, `def go_long(self)`, and `def update_position(self)`. They also provide events and a filtering system to define your strategy. A built in technical analysis library gives you access to standard indicators.

Once you write your strategy you run `jesse backtest '2020-03-01' '2020-04-01' --json` and then you can import the resulting JSON file into the Jesse trades info tool, which should be running on `localhost:3000` if you used the Docker Compose file.

<div align="center">
{{< figure src="ignorant-strategy.png" width="750" caption="An ignorant strategy" >}} 
</div>

Some example strategies are available [here](https://github.com/jesse-ai/example-strategies).

Just to show what a simple strategy looks like, here is a sample SMA crossing strategy from that repo:

```python
from jesse.strategies import Strategy
import jesse.indicators as ta
from jesse import utils

class SMACross(Strategy):
    @property
    def slow_sma(self):
        return ta.sma(self.candles, 200)

    @property
    def fast_sma(self):
        return ta.sma(self.candles, 50)

    def should_long(self) -> bool:
        # Golden Cross (reference: https://www.investopedia.com/terms/g/goldencross.asp)
        # Fast SMA above Slow SMA
        return self.fast_sma > self.slow_sma

    def should_short(self) -> bool:
        # Death Cross (reference: https://www.investopedia.com/terms/d/deathcross.asp)
        # Fast SMA below Slow SMA
        return self.fast_sma < self.slow_sma

    def should_cancel(self) -> bool:
        return False

    def go_long(self):
        # Open long position and use entire balance to buy
        qty = utils.size_to_qty(self.capital, self.price, fee_rate=self.fee_rate)

        self.buy = qty, self.price

    def go_short(self):
        # Open short position and use entire balance to sell
        qty = utils.size_to_qty(self.capital, self.price, fee_rate=self.fee_rate)

        self.sell = qty, self.price

    def update_position(self):
        # If there exist long position, but the signal shows Death Cross, then close the position, and vice versa.
        if self.is_long and self.fast_sma < self.slow_sma:
            self.liquidate()
    
        if self.is_short and self.fast_sma > self.slow_sma:
            self.liquidate()

```

## HummingBot

HummingBot is offered in a few different flavors, including a binary for Windows. I chose to run their Docker container. Once its up and running it presents you with a curses-based UI.

<div align="center">
{{< figure src="hummingbot-ui.png" width="750" caption="HummingBot UI" >}} 
</div>

HummingBot can integrate with your Ethereum wallet to interact directly with DeFi exchange smart contracts and run strategies on Defi tokens.

HummingBot comes with a selection of built in strategies, pure marking making, cross exchange market making, perpetual market making, arbitrage, celo arbitrage, AMM arbitrage, and something they call liquidity mining which is a service they're trying to sell which involves many people running HummingBot and getting rewards for creating liquidity for certain pools.

You can write new strategies but they are much more complex compared to Jesse. HummingBot is much better for someone who wants to select a common strategy and tweak parameters. There is also no backtesting functionality in HummingBot which would allow you to test your strategy. There is a paper trading mode you can run with your strategy configuration and see performance in real time.

HummingBot does seem to have a significant community around it with a fairly large [Discord channel](https://discord.hummingbot.io/) and a [small sub-Reddit](https://www.reddit.com/r/Hummingbot/). This makes sense considering it seems like a pretty easy option for people to just jump in.

There is also an entire company built behind the bot who is growing and hiring. It seems to be a decent product but their focus is going to be making themselves money compared to a community project. Their liquidity mining system seems to be how they're making money so far. It seems to me like this could be creating arbitrary trades and pumping certain coins or exchanges, but I'd have to learn more about this system before I was comfortable supporting or condemning it.

I let this basic strategy run overnight and came up with the following results:

```
Strategy Configurations:
                              Key               Value
                         strategy  pure_market_making
                         exchange        coinbase_pro
                           market             BTC-USD
                       bid_spread                0.17
                       ask_spread                0.17
                   minimum_spread                -100
               order_refresh_time                 900
                    max_order_age                1800
      order_refresh_tolerance_pct                   0
                     order_amount              0.0002
                    price_ceiling                  -1
                      price_floor                  -1
                ping_pong_enabled                True
                     order_levels                   1
               order_level_amount                   0
               order_level_spread                   1
           inventory_skew_enabled               False
        inventory_target_base_pct                  50
       inventory_range_multiplier                   1
                  inventory_price                   1
               filled_order_delay                  60
           hanging_orders_enabled               False
        hanging_orders_cancel_pct                  10
       order_optimization_enabled               False
     ask_order_optimization_depth                   0
     bid_order_optimization_depth                   0
            add_transaction_costs               False
                     price_source      current_market
                       price_type           mid_price
            price_source_exchange                None
              price_source_market                None
                  take_if_crossed                None
          price_source_custom_api                None
                   order_override                None
```

<div align="center">
{{< figure src="hummingbot-results.png" width="750" caption="HummingBot trading results" >}} 
</div>

However, I don't think these results are particularly indicative of the utility of the bot because currently the entire market is crashing, so we're not really experiencing "normal" volatility, and these settings were configured before we had an even bigger drop overnight. Also, this was only over a period of ~12 hours, which is a very small period for these kinds of automated trading strategies.

The idea with these market making strategies is to try to figure out the average price swing within the period you're going to be trading, and then set your bid and ask spread as to hit the tops and bottoms of the candles.

## CryptoSignal

CryptoSignal was another project I ran across while looking for trading bots that seemed to have a good number of stars on GitHub, but it isn't a "bot" really, and more of an alert system. You can select different indicators to follow, and then the program will alert you via your selected notification system when they signal a good time for a trade. However this system relies on you making the actual trade manually once you get the signal. I could see how some people might like to just get signals and then decide to go through with a trade themselves, but this isn't really what I'm looking for personally.

Right off the bat CryptoSignal strikes me as a dead project. The website linked from their GitHub is expired, and their Discord is a ghost town. The latest commit as of writing is an update to the README file in September 2020. 

It does have a lot of built in notification options to keep you updated on your trades via different means including Discord, Slack, Telegram, or GMail.

The only installation method available is via Docker, which is fine for me but might not be the best option for others. They provide a default configuration file to get started with, and you set up the config file and run the container and off it goes. So you're limited to built in strategies that you can configure with the existing options.

While it's running it will print out the various indicators you specified in the config file for each pair per exchange. So it seems like it does its job still despite not having much activity, but it's not exactly what I'm looking for.

## Conclusion

I liked Jesse the most, however the live trading module is still not available so it is limited to backtesting. HummingBot is great for running common strategies but is much more complicated if you wanted to implement your own. I will continue to cover other trading bots I come across, please feel free to reach out to me on [Twitter](https://twitter.com/venatiodecorus) and let me know what trading bot is your favorite.