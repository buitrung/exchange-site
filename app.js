const axios = require('axios');
const express = require('express');
const socketio = require('socket.io');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index');
});

const order_cnt = 10;

function generateNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function generateSizes(max_total_size) {
  let rand_arr = [];
  for (let i = 0; i < order_cnt; i++) {
    rand_arr.push(Math.random());
  }

  let rand_total = rand_arr.reduce((sum, num) => sum + num, 0);
  let generated_sizes = rand_arr.map(rand_num => rand_num * max_total_size / rand_total);

  return generated_sizes;
}

function generateOrders(order_type, original_price, original_size) {
  if (order_type != 'bid' && order_type != 'ask') {
    throw new Error(`Unknown order_type: ${order_type}`);
  }

  const max_bid_volume = generateNumber(4, 5);
  const max_ask_size = generateNumber(140, 150);

  let decimal_cnt = 0;
  if (Math.floor(original_price) != original_price) {
    decimal_cnt = original_price.toString().split('.')[1].length || 0;
  }

  let is_price_desc = (order_type == 'bid') ? true : false;
  let max_total_size = (order_type == 'bid')
    ? max_bid_volume / original_price
    : max_ask_size;

  let generated_sizes = generateSizes(max_total_size);

  let generated_orders = [
    {
      price: original_price,
      size: generated_sizes[0]
    }
  ];
  for (let i = 1; i < order_cnt; i++) {
    let generated_price = is_price_desc
      ? original_price - i * Math.pow(10, -decimal_cnt)
      : original_price + i * Math.pow(10, -decimal_cnt);
    generated_price = parseFloat(generated_price).toFixed(decimal_cnt);

    generated_orders.push({
      price: generated_price,
      size: generated_sizes[i]
    });
  }

  return generated_orders;
}

async function getOrders() {
  const symbols = 'tETHBTC';

  let symbol_res = await axios.get(`https://api-pub.bitfinex.com/v2/tickers?symbols=${symbols}`)

  let [
    symbol,
    bid, bid_size,
    ask, ask_size,
    daily_change, daily_change_relative,
    last_price,
    volume,
    high, low
  ] = symbol_res.data[0];

  // console.log({
  //   symbol,
  //   bid, bid_size,
  //   ask, ask_size,
  //   daily_change, daily_change_relative,
  //   last_price,
  //   volume,
  //   high, low
  // });

  let all_bid_orders = generateOrders('bid', bid, bid_size);
  let all_ask_orders = generateOrders('ask', ask, ask_size);

  let orders = {
    bid: all_bid_orders,
    ask: all_ask_orders
  };
  return orders;
}

app.get('/api/orders', async (req, res) => {
  let orders = await getOrders();
  res.json(orders);
});

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log("server is running");
});

const domain = (process.env.NODE_ENV == 'production')
  ? 'http://exchange-site22.herokuapp.com'
  : `http://localhost:${port}`;

console.log('process.env.NODE_ENV=', process.env.NODE_ENV);
console.log('domain=', domain);

const io = socketio(server, {
  cors: {
    origin: domain,
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
    credentials: true
  },
  allowEIO3: true
});

io.on('connection', (socket) => {
  console.log('New user connected');

  let interval_id = setInterval(async () => {
    let orders = await getOrders();
    io.sockets.emit('fetch_orders', orders);
  }, 3000);

  socket.on('disconnect', () => {
    console.log('User disconnected');
    clearInterval(interval_id);
  });
});

