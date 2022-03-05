function getOrders(callback) {
  let xmlhttp = new XMLHttpRequest();
  xmlhttp.open('GET', '/api/orders', true);
  xmlhttp.responseType = 'json';
  xmlhttp.onload = function() {
    let data = xmlhttp.response;
    callback(data);
  }
  xmlhttp.send();
}

function renderOrders(orders) {
  let bid_orders_comp = document.querySelector('#bid-orders');
  let ask_orders_comp = document.querySelector('#ask-orders');
  let total_bid_volume_comp = document.querySelector('#total-bid-volume');
  let total_ask_size_comp = document.querySelector('#total-ask-size');

  let {
    bid: bid_orders,
    ask: ask_orders
  } = orders;

  let bid_orders_content = '';
  let ask_orders_content = '';

  for (let bid_order of bid_orders) {
    bid_orders_content += `
      <tr>
        <td>${bid_order.size}</td>
        <td class="text-right">${bid_order.price}</td>
      </tr>
    `;
  }
  for (let ask_order of ask_orders) {
    ask_orders_content += `
      <tr>
        <td>${ask_order.price}</td>
        <td class="text-right">${ask_order.size}</td>
      </tr>
    `;
  }

  bid_orders_comp.innerHTML = bid_orders_content;
  ask_orders_comp.innerHTML = ask_orders_content;

  total_bid_volume_comp.innerHTML = bid_orders
    .reduce((sum, order) => sum + order.price * order.size, 0);
  total_ask_size_comp.innerHTML = ask_orders
    .reduce((sum, order) => sum + order.size, 0);
}

(function() {
  let socket = io.connect(window.location.origin);

  socket.on('fetch_orders', (orders) => {
    renderOrders(orders);
  });

  // Since we use socket.io to fetch orders, no need to call API by Ajax when start
  // getOrders((orders) => {
  //   renderOrders(orders);
  // });
})();
