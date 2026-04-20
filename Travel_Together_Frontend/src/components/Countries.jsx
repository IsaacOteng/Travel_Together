import axios from 'axios';

axios.get('https://www.apicountries.com/countries')
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error fetching the country data:', error);
  });