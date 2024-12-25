const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = 3000;

// Serve static files (like CSS) from the 'public' directory
app.use(express.static('public'));

// Create MySQL database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed: ', err);
    return;
  }
  console.log('Connected to MySQL database!');
});

// Routes
// Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <link rel="stylesheet" type="text/css" href="/styles.css">
      </head>
      <body>
        <div class="container">
          <div class="left-side">
            <h1>Welcome to Resale Flat Prices App</h1>
            <p>This app provides detailed resale flat prices based on the registration date from Jan 2017 onwards in Singapore.</p>
            
            <button onclick="location.href='/towns'">Go to Towns</button>
            <button onclick="location.href='/flats'">Go to Available Flats</button>
            <button onclick="location.href='/CPFT'">Go to Comparison of Resale Prices by Flat Types</button>
            <button onclick="location.href='/transactions'">Go to Transactions</button>
            <button onclick="location.href='/comparison-average-prices'">Compare Average Prices by Town</button>
          </div>
          <div class="mbox">
            <div class="right-side">
              <!-- Import the SVG image from the public folder -->
              <img src="/Singapore_location_map.svg" alt="Singapore Location Map" class="location-map-svg">
              <!-- Add the heading below the map -->
              <h3 class="map-heading">Singapore Map</h3>
            </div>
          </div>
        </div>
  
        <!-- Dataset Information Section -->
        <section class="dataset-info">
          <h2>Resale Flat Prices Dataset Overview</h2>
          <p><strong>Data from:</strong> January 2017 to December 2024. Updated about 14 hours ago.</p>

          <h3>About the Dataset</h3>
          <p>This dataset provides the resale prices of flats in Singapore based on the registration date. The prices reflect various transactions over the years and offer insights into market trends from 2017 to the present day.</p>
          
          <h3>Important Notes:</h3>
          <ul>
            <li><strong>Floor Area:</strong> The approximate floor area includes any recess area purchased, space added under HDB’s upgrading programmes, roof terrace, etc.</li>
            <li><strong>Transaction Exclusions:</strong> The data excludes resale transactions that may not reflect the full market price such as resale between relatives or the resale of part shares in a flat.</li>
            <li><strong>Indicative Prices:</strong> The resale prices should be taken as indicative only. The actual resale prices are influenced by many factors such as location, size, and market conditions at the time of sale.</li>
          </ul>

          <h3>Additional Information</h3>
          <p><strong>Housing & Development Board (HDB):</strong> HDB is the statutory board responsible for the planning, development, and management of public housing in Singapore. The flats covered in this dataset are part of HDB’s public housing program.</p>
        </section>
      </body>
    </html>
  `);
});

  
  // Example route: Get towns
app.get('/towns', (req, res) => {
  const query = 'SELECT * FROM towns';
  db.query(query, (err, results) => {
    if (err) throw err;

    let tableHTML = `
      <html>
        <head>
          <link rel="stylesheet" type="text/css" href="/styles.css">
        </head>
        <body>
          <h1>Towns</h1>
          <table>
            <thead>
              <tr>
                <th>Town ID</th>
                <th>Town Name</th>
              </tr>
            </thead>
            <tbody>`;

    results.forEach(town => {
      tableHTML += `
        <tr>
          <td>${town.town_id}</td>
          <td>${town.town_name}</td>
        </tr>`;
    });

    tableHTML += `
          </tbody>
        </table>
        <button onclick="location.href='/'">Go to Home</button>
      
        <button onclick="location.href='/flats'">Go to Available Flats</button>
        <button onclick="location.href='/CPFT'"> comparison of resale prices by flat-types</button>
        <button onclick="location.href='/transactions'">Go to Transactions</button>
        <button onclick="location.href='/comparison-average-prices'">Compare Average Prices by Town</button>
      </body>
    </html>`;
    res.send(tableHTML);
  });
});

// Example route: Comparison of average prices between towns
app.get('/comparison-average-prices', (req, res) => {
  const query = `
    SELECT 
      t.town_name, 
      tr.month AS month, 
      AVG(tr.resale_price) AS avg_resale_price
    FROM transactions tr
    JOIN blocks b ON tr.block_id = b.block_id
    JOIN towns t ON b.town_id = t.town_id
    WHERE tr.month >= '2017-01'
    GROUP BY t.town_name, tr.month
    ORDER BY month ASC, t.town_name ASC;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    const months = [...new Set(results.map(row => row.month))];
    const groupedData = {};

    results.forEach(row => {
      if (!groupedData[row.town_name]) {
        groupedData[row.town_name] = Array(months.length).fill(null);
      }
      const monthIndex = months.indexOf(row.month);
      groupedData[row.town_name][monthIndex] = row.avg_resale_price;
    });

    const datasets = Object.keys(groupedData).map(town => ({
      label: town,
      data: groupedData[town],
      borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`,
      fill: false,
      tension: 0.4,
    }));

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comparison of Average Prices Between Towns</title>
          <link rel="stylesheet" type="text/css" href="/styles.css">
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <h1>Comparison of Average Prices Between Towns</h1>
          <canvas id="townComparisonChart" width="800" height="400"></canvas>
          <script>
            const ctx = document.getElementById('townComparisonChart').getContext('2d');
            new Chart(ctx, {
              type: 'line',
              data: {
                labels: ${JSON.stringify(months)},
                datasets: ${JSON.stringify(datasets)},
              },
              options: {
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  tooltip: { enabled: true }
                },
                scales: {
                  x: {
                    title: { display: true, text: 'Month' },
                    ticks: { autoSkip: true, maxTicksLimit: 12 },
                  },
                  y: {
                    title: { display: true, text: 'Average Price (SGD)' },
                    ticks: {
                      callback: function(value) {
                        return 'SGD ' + value.toLocaleString();
                      }
                    }
                  }
                }
              }
            });
          </script>
          <button onclick="location.href='/'">Go to Home</button>
          <button onclick="location.href='/towns'">Go to Towns</button>
                  <button onclick="location.href='/flats'">Go to Available Flats</button>
          <button onclick="location.href='/CPFT'">comparison -of- resale prices-by-flat-types</button>
          <button onclick="location.href='/transactions'">Go to Transactions</button>
        </body>
      </html>
    `);
  });
});

// Other routes remain the same...
app.get('/transactions', (req, res) => {
    const query = `
      SELECT tr.month, COUNT(tr.transaction_id) AS total_transactions
      FROM transactions tr
      WHERE tr.month >= '2017-01'
      GROUP BY tr.month
      ORDER BY tr.month ASC
    `;
    
    db.query(query, (err, results) => {
      if (err) throw err;
  
      const months = results.map(row => row.month);
      const transactions = results.map(row => row.total_transactions);
  
      let html = `
        <html>
          <head>
            <link rel="stylesheet" type="text/css" href="/styles.css">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          </head>
          <body>
            <h1>Resale Transactions from Jan 2017 Onwards</h1>
            <canvas id="transactionsChart" width="400" height="200"></canvas>
            <script>
              const ctx = document.getElementById('transactionsChart').getContext('2d');
              const transactionsChart = new Chart(ctx, {
                type: 'line',
                data: {
                  labels: ${JSON.stringify(months)},
                  datasets: [{
                    label: 'Total Transactions',
                    data: ${JSON.stringify(transactions)},
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                  }]
                },
                options: {
                  responsive: true,
                  scales: {
                    x: { title: { display: true, text: 'Month' } },
                    y: { title: { display: true, text: 'Total Transactions' }, beginAtZero: true }
                  }
                }
              });
            </script>
            <button onclick="location.href='/'">Go to Home</button>
            <button onclick="location.href='/towns'">Go to Towns</button>
            <button onclick="location.href='/comparison-average-prices'">Comparison of Average Prices Between Towns</button>
            <button onclick="location.href='/flats'">Go to Available Flats</button>
            <button onclick="location.href='/CPFT'">comparison -of- resale prices-by-flat-types</button>
          </body>
        </html>
      `;
  
      res.send(html);
    });
  });
  

// flats 

  app.get('/flats', (req, res) => {
    const query = 'SELECT * FROM flats';
    db.query(query, (err, results) => {
      if (err) throw err;
  
      let tableHTML = `
        <html>
          <head>
            <link rel="stylesheet" type="text/css" href="/styles.css">
          </head>
          <body>
            <h1>Available Flat Types</h1>
            <table>
              <thead>
                <tr>
                  <th>Flat Type ID</th>
                  <th>Flat Type</th>
                  <th>Flat Model</th>
                </tr>
              </thead>
              <tbody>`;
  
      results.forEach(flat => {
        tableHTML += `
          <tr>
            <td>${flat.flat_type_id}</td>
            <td>${flat.flat_type}</td>
            <td>${flat.flat_model}</td>
          </tr>`;
      });
  
      tableHTML += `
              </tbody>
            </table>
            <button onclick="location.href='/'">Go to Home</button>
            <button onclick="location.href='/towns'">Go to Towns</button>
             <button onclick="location.href='/comparison-average-prices'">Comparison of Average Prices Between Towns</button>
            <button onclick="location.href='/CPFT'">comparison -of- resale prices-by-flat-types</button>
            <button onclick="location.href='/transactions'">Go to Transactions</button>
          </body>
        </html>`;
  
      res.send(tableHTML);
    });
  });
  




  app.get('/CPFT', (req, res) => {
    const query = `
      SELECT 
        f.flat_type AS flat_type, 
        tr.month AS month, 
        AVG(tr.resale_price) AS avg_resale_price
      FROM transactions tr
      JOIN flats f ON tr.flat_type_id = f.flat_type_id
      WHERE tr.month >= '2017-01'
      GROUP BY f.flat_type, tr.month
      ORDER BY month ASC, f.flat_type ASC;
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      // Extract unique months
      const months = [...new Set(results.map(row => row.month))];
  
      // Group data by flat type
      const groupedData = {};
      results.forEach(row => {
        if (!groupedData[row.flat_type]) {
          groupedData[row.flat_type] = Array(months.length).fill(null);
        }
        const monthIndex = months.indexOf(row.month);
        groupedData[row.flat_type][monthIndex] = row.avg_resale_price;
      });
  
      // Prepare datasets for Chart.js
      const datasets = Object.keys(groupedData).map(flatType => ({
        label: flatType,
        data: groupedData[flatType],
        borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`,
        fill: false,
        tension: 0.4,
      }));
  
      // Send the response with the Chart.js integration
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Comparison of Average Prices by Flat Types</title>
            <link rel="stylesheet" type="text/css" href="/styles.css">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          </head>
          <body>
            <h1>Comparison of Average Prices by Flat Types</h1>
            <canvas id="flatComparisonChart" width="800" height="400"></canvas>
            <script>
              const ctx = document.getElementById('flatComparisonChart').getContext('2d');
              new Chart(ctx, {
                type: 'line',
                data: {
                  labels: ${JSON.stringify(months)},
                  datasets: ${JSON.stringify(datasets)},
                },
                options: {
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: { enabled: true }
                  },
                  scales: {
                    x: {
                      title: { display: true, text: 'Month' },
                      ticks: { autoSkip: true, maxTicksLimit: 12 },
                    },
                    y: {
                      title: { display: true, text: 'Average Price (SGD)' },
                      ticks: {
                        callback: function(value) {
                          return 'SGD ' + value.toLocaleString();
                        }
                      }
                    }
                  }
                }
              });
            </script>
            <button onclick="location.href='/'">Go to Home</button>
            <button onclick="location.href='/towns'">Go to Towns</button>
            <button onclick="location.href='/flats'">Go to Available Flats</button>
             <button onclick="location.href='/comparison-average-prices'">Comparison of Average Prices Between Towns</button>
            <button onclick="location.href='/transactions'">Go to Transactions</button>
          </body>
        </html>
      `);
    });
  });
  


  
// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
