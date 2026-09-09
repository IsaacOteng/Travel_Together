/**
 * Country list for the phone-code and nationality pickers.
 *
 * Held locally on purpose. This was fetched from restcountries.com at runtime
 * until that API deprecated the version we called, which silently broke both
 * pickers — an offline list cannot break, needs no CORS, and searches instantly.
 * Generated from the mledoze/countries dataset.
 *
 * Columns: name, ISO 3166-1 alpha-2, dial code, English demonym, alt spellings.
 */

const ROWS = [
  ["Afghanistan", "AF", "+93", "Afghan", "AF | Afġānistān | Islamic Republic of Afghanistan | Owganystan | افغانستان"],
  ["Albania", "AL", "+355", "Albanian", "AL | Republic of Albania | Shqipnia | Shqipëri | Shqipëria"],
  ["Algeria", "DZ", "+213", "Algerian", "Algérie | DZ | Dzayer | People's Democratic Republic of Algeria | الجزائر"],
  ["American Samoa", "AS", "+1684", "American Samoan", "AS | Amelika Sāmoa | Amerika Sāmoa | Sāmoa Amelika"],
  ["Andorra", "AD", "+376", "Andorran", "AD | Principality of Andorra | Principat d'Andorra"],
  ["Angola", "AO", "+244", "Angolan", "AO | Republic of Angola | República de Angola | ʁɛpublika de an'ɡɔla"],
  ["Anguilla", "AI", "+1264", "Anguillian", "AI"],
  ["Antigua and Barbuda", "AG", "+1268", "Antiguan, Barbudan", "AG"],
  ["Argentina", "AR", "+54", "Argentine", "AR | Argentine Republic | República Argentina"],
  ["Armenia", "AM", "+374", "Armenian", "AM | Hayastan | Republic of Armenia | Հայաստան | Հայաստանի Հանրապետություն"],
  ["Aruba", "AW", "+297", "Aruban", "AW"],
  ["Australia", "AU", "+61", "Australian", "AU | Commonwealth of Australia"],
  ["Austria", "AT", "+43", "Austrian", "AT | Oesterreich | Osterreich | Republic of Austria | Österreich"],
  ["Azerbaijan", "AZ", "+994", "Azerbaijani", "AZ | Azərbaycan | Azərbaycan Respublikası | Republic of Azerbaijan | Азербайджан"],
  ["Bahamas", "BS", "+1242", "Bahamian", "BS | Commonwealth of the Bahamas"],
  ["Bahrain", "BH", "+973", "Bahraini", "BH | Kingdom of Bahrain | Mamlakat al-Baḥrayn | البحرين"],
  ["Bangladesh", "BD", "+880", "Bangladeshi", "BD | Gônôprôjatôntri Bangladesh | People's Republic of Bangladesh | বাংলাদেশ"],
  ["Barbados", "BB", "+1246", "Barbadian", "BB"],
  ["Belarus", "BY", "+375", "Belarusian", "BY | Bielaruś | Republic of Belarus | Белару́сь | Беларусь | Белоруссия | Республика Белоруссия"],
  ["Belgium", "BE", "+32", "Belgian", "BE | Belgie | Belgien | Belgique | België | Kingdom of Belgium | Koninkrijk België | Königreich Belgien | Royaume de Belgique"],
  ["Belize", "BZ", "+501", "Belizean", "BZ | Belice"],
  ["Benin", "BJ", "+229", "Beninese", "BJ | Bénin | Republic of Benin | République du Bénin"],
  ["Bermuda", "BM", "+1441", "Bermudian", "BM | Somers Isles | The Bermudas | The Islands of Bermuda"],
  ["Bhutan", "BT", "+975", "Bhutanese", "BT | Kingdom of Bhutan | འབྲུག་ཡུལ་"],
  ["Bolivia", "BO", "+591", "Bolivian", "BO | Bolivia, Plurinational State of | Buliwya | Buliwya Mamallaqta | Estado Plurinacional de Bolivia | Plurinational State of Bolivia | Tetã Volívia | Volívia | Wuliwya | Wuliwya Suyu"],
  ["Bosnia and Herzegovina", "BA", "+387", "Bosnian, Herzegovinian", "BA | Bosna i Hercegovina | Bosnia-Herzegovina | Боснa и Херцеговина | Босна и Херцеговина"],
  ["Botswana", "BW", "+267", "Motswana", "BW | Lefatshe la Botswana | Republic of Botswana"],
  ["Bouvet Island", "BV", "+47", "", "BV | Bouvet-øya | Bouvetøya"],
  ["Brazil", "BR", "+55", "Brazilian", "BR | Brasil | Federative Republic of Brazil | República Federativa do Brasil"],
  ["British Indian Ocean Territory", "IO", "+246", "Indian", "IO"],
  ["British Virgin Islands", "VG", "+1284", "Virgin Islander", "VG | Virgin Islands | Virgin Islands, British"],
  ["Brunei", "BN", "+673", "Bruneian", "BN | Brunei Darussalam | Nation of Brunei | Nation of Brunei, Abode of Peace | Negara Brunei Darussalam | the Abode of Peace"],
  ["Bulgaria", "BG", "+359", "Bulgarian", "BG | Republic of Bulgaria | България | Република България"],
  ["Burkina Faso", "BF", "+226", "Burkinabe", "BF"],
  ["Burundi", "BI", "+257", "Burundian", "BI | Republic of Burundi | Republika y'Uburundi | République du Burundi | Uburundi"],
  ["Cambodia", "KH", "+855", "Cambodian", "KH | Kingdom of Cambodia | Kâmpŭchéa"],
  ["Cameroon", "CM", "+237", "Cameroonian", "CM | Cameroun | Republic of Cameroon | République du Cameroun"],
  ["Canada", "CA", "+1", "Canadian", "CA"],
  ["Cape Verde", "CV", "+238", "Cape Verdian", "CV | Cabo Verde | Republic of Cabo Verde | República de Cabo Verde"],
  ["Caribbean Netherlands", "BQ", "+599", "Dutch", "BES islands | Bonaire Sint Eustatius and Saba | Bonaire, Sint Eustatius and Saba | Boneiru, Sint Eustatius y Saba | Caribisch Nederland"],
  ["Cayman Islands", "KY", "+1345", "Caymanian", "KY"],
  ["Central African Republic", "CF", "+236", "Central African", "Bêafrîka | CF | République centrafricaine"],
  ["Chad", "TD", "+235", "Chadian", "Republic of Chad | République du Tchad | TD | Tchad | تشاد"],
  ["Chile", "CL", "+56", "Chilean", "CL | Republic of Chile | República de Chile"],
  ["China", "CN", "+86", "Chinese", "CN | People's Republic of China | Zhongguo | Zhonghua | Zhōngguó | Zhōnghuá Rénmín Gònghéguó | 中华人民共和国 | 中国"],
  ["Christmas Island", "CX", "+61", "Christmas Islander", "CX | Territory of Christmas Island"],
  ["Cocos (Keeling) Islands", "CC", "+61", "Cocos Islander", "CC | Cocos Islands | Keeling Islands | Territory of the Cocos (Keeling) Islands"],
  ["Colombia", "CO", "+57", "Colombian", "CO | Republic of Colombia | República de Colombia"],
  ["Comoros", "KM", "+269", "Comoran", "Comores | KM | Komori | Udzima wa Komori | Union des Comores | Union of the Comoros | al-Ittiḥād al-Qumurī | جزر القمر"],
  ["Congo", "CG", "+242", "Congolese", "CG | Congo-Brazzaville | Repubilika ya Kongo | Republic of the Congo | Republíki ya Kongó | République du Congo"],
  ["Cook Islands", "CK", "+682", "Cook Islander", "CK | Kūki 'Āirani"],
  ["Costa Rica", "CR", "+506", "Costa Rican", "CR | Republic of Costa Rica | República de Costa Rica"],
  ["Croatia", "HR", "+385", "Croatian", "HR | Hrvatska | Republic of Croatia | Republika Hrvatska"],
  ["Cuba", "CU", "+53", "Cuban", "CU | Republic of Cuba | República de Cuba"],
  ["Curaçao", "CW", "+599", "Curaçaoan", "CW | Country of Curaçao | Curacao | Kòrsou | Land Curaçao | Pais Kòrsou"],
  ["Cyprus", "CY", "+357", "Cypriot", "CY | Kýpros | Kıbrıs | Kıbrıs Cumhuriyeti | Republic of Cyprus | Κυπριακή Δημοκρατία | Κύπρος"],
  ["Czechia", "CZ", "+420", "Czech", "CZ | Czech Republic | Česko | Česká republika"],
  ["DR Congo", "CD", "+243", "Congolese", "CD | Congo, the Democratic Republic of the | Congo-Kinshasa | DRC | Democratic Republic of Congo | Democratic Republic of the Congo | Ditunga dia Kongu wa Mungalaata | Jamhuri ya Kidemokrasia ya Kongo | RD Congo | Repubilika ya Kongo Demokratiki | Republiki ya Kongó Demokratiki"],
  ["Denmark", "DK", "+45", "Danish", "DK | Danmark | Kingdom of Denmark | Kongeriget Danmark"],
  ["Djibouti", "DJ", "+253", "Djibouti", "DJ | Gabuuti | Gabuutih Ummuuno | Jabuuti | Jamhuuriyadda Jabuuti | Republic of Djibouti | République de Djibouti | جيبوتي"],
  ["Dominica", "DM", "+1767", "Dominican", "Commonwealth of Dominica | DM | Dominique | Wai‘tu kubuli"],
  ["Dominican Republic", "DO", "+1", "Dominican", "DO | República Dominicana"],
  ["Ecuador", "EC", "+593", "Ecuadorean", "EC | Republic of Ecuador | República del Ecuador"],
  ["Egypt", "EG", "+20", "Egyptian", "Arab Republic of Egypt | EG | مصر"],
  ["El Salvador", "SV", "+503", "Salvadoran", "Republic of El Salvador | República de El Salvador | SV"],
  ["Equatorial Guinea", "GQ", "+240", "Equatorial Guinean", "GQ | Guinea Ecuatorial | Guiné Equatorial | Guinée équatoriale | Republic of Equatorial Guinea | República da Guiné Equatorial | República de Guinea Ecuatorial | République de Guinée équatoriale"],
  ["Eritrea", "ER", "+291", "Eritrean", "Dawlat Iritriyá | ER | Iritriyā | State of Eritrea | ʾErtrā | إريتريا | ሃገረ ኤርትራ | ኤርትራ"],
  ["Estonia", "EE", "+372", "Estonian", "EE | Eesti | Eesti Vabariik | Republic of Estonia"],
  ["Eswatini", "SZ", "+268", "Swazi", "Kingdom of Eswatini | Ngwane | SZ | Swatini | Swaziland | Umbuso weSwatini | weSwatini"],
  ["Ethiopia", "ET", "+251", "Ethiopian", "ET | Federal Democratic Republic of Ethiopia | ʾĪtyōṗṗyā | ኢትዮጵያ | የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ"],
  ["Falkland Islands", "FK", "+500", "Falkland Islander", "FK | Falkland Islands (Malvinas) | Islas Malvinas"],
  ["Faroe Islands", "FO", "+298", "Faroese", "FO | Faeroe Islands | Færøerne | Føroyar"],
  ["Fiji", "FJ", "+679", "Fijian", "FJ | Fijī Gaṇarājya | Matanitu ko Viti | Republic of Fiji | Viti | फिजी"],
  ["Finland", "FI", "+358", "Finnish", "FI | Republic of Finland | Republiken Finland | Suomen tasavalta | Suomi"],
  ["France", "FR", "+33", "French", "FR | French Republic | République française"],
  ["French Guiana", "GF", "+594", "Guianan", "GF | Guiana | Guyane | Guyane française"],
  ["French Polynesia", "PF", "+689", "French Polynesian", "PF | Polynésie française | Pōrīnetia Farāni"],
  ["French Southern and Antarctic Lands", "TF", "+262", "French", "French Southern Territories | TF"],
  ["Gabon", "GA", "+241", "Gabonese", "GA | Gabonese Republic | République Gabonaise"],
  ["Gambia", "GM", "+220", "Gambian", "GM | Republic of the Gambia"],
  ["Georgia", "GE", "+995", "Georgian", "GE | Sakartvelo | საქართველო"],
  ["Germany", "DE", "+49", "German", "Bundesrepublik Deutschland | DE | Deutschland | Federal Republic of Germany"],
  ["Ghana", "GH", "+233", "Ghanaian", "GH | Republic of Ghana"],
  ["Gibraltar", "GI", "+350", "Gibraltar", "GI"],
  ["Greece", "GR", "+30", "Greek", "Elláda | GR | Hellenic Republic | Ελλάδα | Ελληνική Δημοκρατία"],
  ["Greenland", "GL", "+299", "Greenlandic", "GL | Grønland | Kalaallit Nunaat"],
  ["Grenada", "GD", "+1473", "Grenadian", "GD"],
  ["Guadeloupe", "GP", "+590", "Guadeloupian", "GP | Gwadloup"],
  ["Guam", "GU", "+1671", "Guamanian", "GU | Guåhån"],
  ["Guatemala", "GT", "+502", "Guatemalan", "GT | Republic of Guatemala"],
  ["Guernsey", "GG", "+44", "Channel Islander", "Bailiwick of Guernsey | Bailliage de Guernesey | Dgèrnésiais | GG | Guernesey"],
  ["Guinea", "GN", "+224", "Guinean", "GN | Guinée | Republic of Guinea | République de Guinée"],
  ["Guinea-Bissau", "GW", "+245", "Guinea-Bissauan", "GW | Guiné-Bissau | Republic of Guinea-Bissau | República da Guiné-Bissau"],
  ["Guyana", "GY", "+592", "Guyanese", "Co-operative Republic of Guyana | GY"],
  ["Haiti", "HT", "+509", "Haitian", "Ayiti | HT | Haïti | Repiblik Ayiti | Republic of Haiti | République d'Haïti"],
  ["Honduras", "HN", "+504", "Honduran", "HN | Republic of Honduras | República de Honduras"],
  ["Hong Kong", "HK", "+852", "Hong Konger", "HK | 香港"],
  ["Hungary", "HU", "+36", "Hungarian", "HU | Magyarország"],
  ["Iceland", "IS", "+354", "Icelander", "IS | Island | Lýðveldið Ísland | Republic of Iceland | Ísland"],
  ["India", "IN", "+91", "Indian", "Bharat Ganrajya | Bhārat | IN | Republic of India | भारत | இந்தியா"],
  ["Indonesia", "ID", "+62", "Indonesian", "ID | Republic of Indonesia | Republik Indonesia"],
  ["Iran", "IR", "+98", "Iranian", "IR | Iran, Islamic Republic of | Islamic Republic of Iran | Jomhuri-ye Eslāmi-ye Irān | ایران"],
  ["Iraq", "IQ", "+964", "Iraqi", "IQ | Jumhūriyyat al-‘Irāq | Republic of Iraq | العراق | کۆماری | ܩܘܼܛܢܵܐ"],
  ["Ireland", "IE", "+353", "Irish", "IE | Poblacht na hÉireann | Republic of Ireland | Éire"],
  ["Isle of Man", "IM", "+44", "Manx", "Ellan Vannin | IM | Mann | Mannin"],
  ["Israel", "IL", "+972", "Israeli", "IL | Medīnat Yisrā'el | State of Israel | ישראל | إسرائيل"],
  ["Italy", "IT", "+39", "Italian", "IT | Italia | Italian Republic | Repubblica italiana"],
  ["Ivory Coast", "CI", "+225", "Ivorian", "CI | Cote d'Ivoire | Côte d'Ivoire | Republic of Côte d'Ivoire | République de Côte d'Ivoire"],
  ["Jamaica", "JM", "+1876", "Jamaican", "JM"],
  ["Japan", "JP", "+81", "Japanese", "JP | Nihon | Nippon | 日本"],
  ["Jersey", "JE", "+44", "Channel Islander", "Bailiwick of Jersey | Bailliage de Jersey | Bailliage dé Jèrri | JE | Jèrri"],
  ["Jordan", "JO", "+962", "Jordanian", "Hashemite Kingdom of Jordan | JO | al-Mamlakah al-Urdunīyah al-Hāshimīyah | الأردن"],
  ["Kazakhstan", "KZ", "+7", "Kazakhstani", "KZ | Qazaqstan | Qazaqstan Respublïkası | Republic of Kazakhstan | Respublika Kazakhstan | Казахстан | Республика Казахстан | Қазақстан | Қазақстан Республикасы"],
  ["Kenya", "KE", "+254", "Kenyan", "Jamhuri ya Kenya | KE | Republic of Kenya"],
  ["Kiribati", "KI", "+686", "I-Kiribati", "KI | Republic of Kiribati | Ribaberiki Kiribati"],
  ["Kosovo", "XK", "+383", "Kosovar", "Kosova | Republic of Kosovo | XK | Косово | Република Косово"],
  ["Kuwait", "KW", "+965", "Kuwaiti", "Dawlat al-Kuwait | KW | State of Kuwait | الكويت"],
  ["Kyrgyzstan", "KG", "+996", "Kirghiz", "KG | Kyrgyz Republic | Kyrgyz Respublikasy | Киргизия | Кыргыз Республикасы | Кыргызстан"],
  ["Laos", "LA", "+856", "Laotian", "LA | Lao | Lao People's Democratic Republic | Sathalanalat Paxathipatai Paxaxon Lao | ສປປລາວ"],
  ["Latvia", "LV", "+371", "Latvian", "LV | Latvija | Latvijas Republika | Republic of Latvia"],
  ["Lebanon", "LB", "+961", "Lebanese", "Al-Jumhūrīyah Al-Libnānīyah | LB | Lebanese Republic | Liban | لبنان"],
  ["Lesotho", "LS", "+266", "Mosotho", "Kingdom of Lesotho | LS | Muso oa Lesotho"],
  ["Liberia", "LR", "+231", "Liberian", "LR | Republic of Liberia"],
  ["Libya", "LY", "+218", "Libyan", "Dawlat Libya | LY | State of Libya | ليبيا"],
  ["Liechtenstein", "LI", "+423", "Liechtensteiner", "Fürstentum Liechtenstein | LI | Principality of Liechtenstein"],
  ["Lithuania", "LT", "+370", "Lithuanian", "LT | Lietuva | Lietuvos Respublika | Republic of Lithuania"],
  ["Luxembourg", "LU", "+352", "Luxembourger", "Grand Duchy of Luxembourg | Grand-Duché de Luxembourg | Groussherzogtum Lëtzebuerg | Großherzogtum Luxemburg | LU | Luxemburg | Lëtzebuerg"],
  ["Macau", "MO", "+853", "Macanese", "MO | Macao | 中華人民共和國澳門特別行政區 | 澳门"],
  ["Madagascar", "MG", "+261", "Malagasy", "MG | Madagasikara | Repoblikan'i Madagasikara | Republic of Madagascar | République de Madagascar"],
  ["Malawi", "MW", "+265", "Malawian", "MW | Malaŵi | Republic of Malawi"],
  ["Malaysia", "MY", "+60", "Malaysian", "MY | مليسيا"],
  ["Maldives", "MV", "+960", "Maldivan", "Dhivehi Raajjeyge Jumhooriyya | MV | Maldive Islands | Republic of the Maldives | ދިވެހިރާއްޖޭގެ"],
  ["Mali", "ML", "+223", "Malian", "ML | Republic of Mali | République du Mali"],
  ["Malta", "MT", "+356", "Maltese", "MT | Repubblika ta' Malta | Republic of Malta"],
  ["Marshall Islands", "MH", "+692", "Marshallese", "Aolepān Aorōkin M̧ajeļ | MH | M̧ajeļ | Republic of the Marshall Islands"],
  ["Martinique", "MQ", "+596", "Martinican", "MQ"],
  ["Mauritania", "MR", "+222", "Mauritanian", "Islamic Republic of Mauritania | MR | موريتانيا"],
  ["Mauritius", "MU", "+230", "Mauritian", "MU | Maurice | Moris | Republic of Mauritius | République de Maurice"],
  ["Mayotte", "YT", "+262", "Mahoran", "Department of Mayotte | Département de Mayotte | YT"],
  ["Mexico", "MX", "+52", "Mexican", "Estados Unidos Mexicanos | MX | Mexicanos | México | United Mexican States"],
  ["Micronesia", "FM", "+691", "Micronesian", "FM | Federated States of Micronesia | Micronesia, Federated States of"],
  ["Moldova", "MD", "+373", "Moldovan", "MD | Moldova, Republic of | Republic of Moldova | Republica Moldova"],
  ["Monaco", "MC", "+377", "Monegasque", "MC | Principality of Monaco | Principauté de Monaco"],
  ["Mongolia", "MN", "+976", "Mongolian", "MN | Монгол улс"],
  ["Montenegro", "ME", "+382", "Montenegrin", "Crna Gora | ME | Црна Гора"],
  ["Montserrat", "MS", "+1664", "Montserratian", "MS"],
  ["Morocco", "MA", "+212", "Moroccan", "Al-Mamlakah al-Maġribiyah | Kingdom of Morocco | MA | المغرب | ⵍⵎⴰⵖⵔⵉⴱ"],
  ["Mozambique", "MZ", "+258", "Mozambican", "MZ | Moçambique | Republic of Mozambique | República de Moçambique"],
  ["Myanmar", "MM", "+95", "Burmese", "Burma | MM | Pyidaunzu Thanmăda Myăma Nainngandaw | Republic of the Union of Myanmar | မြန်မာ"],
  ["Namibia", "NA", "+264", "Namibian", "NA | Namibië | Republic of Namibia"],
  ["Nauru", "NR", "+674", "Nauruan", "NR | Naoero | Pleasant Island | Republic of Nauru | Ripublik Naoero"],
  ["Nepal", "NP", "+977", "Nepalese", "Federal Democratic Republic of Nepal | Loktāntrik Ganatantra Nepāl | NP | नेपाल"],
  ["Netherlands", "NL", "+31", "Dutch", "Holland | Kingdom of the Netherlands | NL | Nederland | The Netherlands"],
  ["New Caledonia", "NC", "+687", "New Caledonian", "NC | Nouvelle-Calédonie"],
  ["New Zealand", "NZ", "+64", "New Zealander", "Aotearoa | NZ"],
  ["Nicaragua", "NI", "+505", "Nicaraguan", "NI | Republic of Nicaragua | República de Nicaragua"],
  ["Niger", "NE", "+227", "Nigerien", "NE | Nijar | Republic of Niger"],
  ["Nigeria", "NG", "+234", "Nigerian", "Federal Republic of Nigeria | NG | Naíjíríà | Nijeriya"],
  ["Niue", "NU", "+683", "Niuean", "NU | Niuē"],
  ["Norfolk Island", "NF", "+672", "Norfolk Islander", "NF | Norf'k Ailen | Teratri of Norf'k Ailen | Territory of Norfolk Island"],
  ["North Korea", "KP", "+850", "North Korean", "Chosŏn Minjujuŭi Inmin Konghwaguk | DPRK | Democratic People's Republic of Korea | KP | Korea, Democratic People's Republic of | 북조선 | 북한 | 조선 | 조선민주주의인민공화국"],
  ["North Macedonia", "MK", "+389", "Macedonian", "MK | Macedonia | Republic of North Macedonia | Македонија | Република Северна Македонија"],
  ["Northern Mariana Islands", "MP", "+1670", "American", "MP | Na Islas Mariånas | Sankattan Siha Na Islas Mariånas"],
  ["Norway", "NO", "+47", "Norwegian", "Kingdom of Norway | Kongeriket Noreg | Kongeriket Norge | NO | Noreg | Norge | Norgga"],
  ["Oman", "OM", "+968", "Omani", "OM | Salṭanat ʻUmān | Sultanate of Oman | عمان"],
  ["Pakistan", "PK", "+92", "Pakistani", "Islamic Republic of Pakistan | Islāmī Jumhūriya'eh Pākistān | PK | Pākistān | پاكستان"],
  ["Palau", "PW", "+680", "Palauan", "Belau | Beluu er a Belau | PW | Republic of Palau"],
  ["Palestine", "PS", "+970", "Palestinian", "Dawlat Filasṭin | PS | Palestine, State of | State of Palestine | فلسطين"],
  ["Panama", "PA", "+507", "Panamanian", "PA | Panamá | Republic of Panama | República de Panamá"],
  ["Papua New Guinea", "PG", "+675", "Papua New Guinean", "Independen Stet bilong Papua Niugini | Independent State of Papua New Guinea | PG | Papua Niu Gini | Papua Niugini"],
  ["Paraguay", "PY", "+595", "Paraguayan", "PY | Paraguái | Republic of Paraguay | República del Paraguay | Tetã Paraguái"],
  ["Peru", "PE", "+51", "Peruvian", "PE | Perú | Piruw | Republic of Peru | República del Perú"],
  ["Philippines", "PH", "+63", "Filipino", "PH | Pilipinas | Republic of the Philippines | Repúblika ng Pilipinas"],
  ["Pitcairn Islands", "PN", "+64", "Pitcairn Islander", "PN | Pitcairn | Pitcairn Group of Islands"],
  ["Poland", "PL", "+48", "Polish", "PL | Polska | Republic of Poland | Rzeczpospolita Polska"],
  ["Portugal", "PT", "+351", "Portuguese", "PT | Portuguesa | Portuguese Republic | República Portuguesa"],
  ["Puerto Rico", "PR", "+1", "Puerto Rican", "Commonwealth of Puerto Rico | Estado Libre Asociado de Puerto Rico | PR"],
  ["Qatar", "QA", "+974", "Qatari", "Dawlat Qaṭar | QA | State of Qatar | قطر"],
  ["Romania", "RO", "+40", "Romanian", "RO | România | Roumania | Rumania"],
  ["Russia", "RU", "+7", "Russian", "RU | Russian Federation | Российская Федерация | Россия"],
  ["Rwanda", "RW", "+250", "Rwandan", "RW | Republic of Rwanda | Repubulika y'u Rwanda | République du Rwanda"],
  ["Réunion", "RE", "+262", "Réunionese", "La Réunion | RE | Reunion | Réunion Island"],
  ["Saint Barthélemy", "BL", "+590", "Saint Barthélemy Islander", "BL | Collectivity of Saint Barthélemy | Collectivité de Saint-Barthélemy | Saint-Barthélemy | St. Barthelemy"],
  ["Saint Helena, Ascension and Tristan da Cunha", "SH", "+2", "Saint Helenian", "Saint Helena"],
  ["Saint Kitts and Nevis", "KN", "+1869", "Kittitian or Nevisian", "KN"],
  ["Saint Lucia", "LC", "+1758", "Saint Lucian", "LC"],
  ["Saint Martin", "MF", "+590", "Saint Martin Islander", "Collectivity of Saint Martin | Collectivité de Saint-Martin | MF | Saint Martin (French part) | Saint-Martin"],
  ["Saint Pierre and Miquelon", "PM", "+508", "Saint-Pierrais, Miquelonnais", "PM | Saint-Pierre-et-Miquelon"],
  ["Saint Vincent and the Grenadines", "VC", "+1784", "Saint Vincentian", "VC"],
  ["Samoa", "WS", "+685", "Samoan", "Independent State of Samoa | Malo Saʻoloto Tutoʻatasi o Sāmoa | Sāmoa | WS"],
  ["San Marino", "SM", "+378", "Sammarinese", "Most Serene Republic of San Marino | Repubblica di San Marino | Republic of San Marino | SM"],
  ["Saudi Arabia", "SA", "+966", "Saudi Arabian", "Al-Mamlakah al-‘Arabiyyah as-Su‘ūdiyyah | Kingdom of Saudi Arabia | SA | Saudi | السعودية"],
  ["Senegal", "SN", "+221", "Senegalese", "Republic of Senegal | République du Sénégal | SN | Sénégal"],
  ["Serbia", "RS", "+381", "Serbian", "RS | Republic of Serbia | Republika Srbija | Srbija | Република Србија | Србија"],
  ["Seychelles", "SC", "+248", "Seychellois", "Repiblik Sesel | Republic of Seychelles | République des Seychelles | SC | Sesel"],
  ["Sierra Leone", "SL", "+232", "Sierra Leonean", "Republic of Sierra Leone | SL"],
  ["Singapore", "SG", "+65", "Singaporean", "Republic of Singapore | Republik Singapura | SG | Singapura | சிங்கப்பூர் | 新加坡 | 新加坡共和国"],
  ["Sint Maarten", "SX", "+1721", "St. Maartener", "SX | Saint-Martin | Sint Maarten (Dutch part)"],
  ["Slovakia", "SK", "+421", "Slovak", "SK | Slovak Republic | Slovensko | Slovenská republika"],
  ["Slovenia", "SI", "+386", "Slovene", "Republic of Slovenia | Republika Slovenija | SI | Slovenija"],
  ["Solomon Islands", "SB", "+677", "Solomon Islander", "SB"],
  ["Somalia", "SO", "+252", "Somali", "Federal Republic of Somalia | Jamhuuriyadda Federaalka Soomaaliya | Jumhūriyyat aṣ-Ṣūmāl al-Fiderāliyya | SO | Soomaaliya | aṣ-Ṣūmāl | الصومال"],
  ["South Africa", "ZA", "+27", "South African", "Aforika Borwa | Afrika Borwa | Afrika Dzonga | Afrika-Borwa | Afurika Tshipembe | Mzantsi Afrika | Ningizimu Afrika | RSA | Republic of South Africa | Sewula Afrika | Suid-Afrika | ZA"],
  ["South Georgia", "GS", "+500", "South Georgian South Sandwich Islander", "GS"],
  ["South Korea", "KR", "+82", "South Korean", "KR | Korea, Republic of | Republic of Korea | 남조선 | 남한 | 한국"],
  ["South Sudan", "SS", "+211", "South Sudanese", "Republic of South Sudan | SS"],
  ["Spain", "ES", "+34", "Spanish", "ES | España | Kingdom of Spain | Reino de España"],
  ["Sri Lanka", "LK", "+94", "Sri Lankan", "LK | ilaṅkai | இலங்கை | ශ්‍රී ලංකාව"],
  ["Sudan", "SD", "+249", "Sudanese", "Jumhūrīyat as-Sūdān | Republic of the Sudan | SD | السودان"],
  ["Suriname", "SR", "+597", "Surinamer", "Republic of Suriname | Republiek Suriname | SR | Sarnam | Sranangron"],
  ["Svalbard and Jan Mayen", "SJ", "+4779", "Norwegian", "SJ | Svalbard and Jan Mayen Islands | Svalbard og Jan Mayen"],
  ["Sweden", "SE", "+46", "Swedish", "Kingdom of Sweden | Konungariket Sverige | SE | Sverige"],
  ["Switzerland", "CH", "+41", "Swiss", "CH | Schweiz | Suisse | Svizra | Svizzera | Swiss Confederation"],
  ["Syria", "SY", "+963", "Syrian", "Al-Jumhūrīyah Al-ʻArabīyah As-Sūrīyah | SY | Syrian Arab Republic | سوريا"],
  ["São Tomé and Príncipe", "ST", "+239", "Sao Tomean", "ST | Sao Tome and Principe | São Tomé e Príncipe"],
  ["Taiwan", "TW", "+886", "Taiwanese", "Chinese Taipei | Republic of China | Republic of China (Taiwan) | TW | Táiwān | Zhōnghuá Mínguó | 中華民國 | 台灣"],
  ["Tajikistan", "TJ", "+992", "Tadzhik", "Republic of Tajikistan | TJ | Toçikiston | Çumhuriyi Toçikiston | Таджикистан | Тоҷикистон | Ҷумҳурии Тоҷикистон"],
  ["Tanzania", "TZ", "+255", "Tanzanian", "Jamhuri ya Muungano wa Tanzania | TZ | Tanzania, United Republic of | United Republic of Tanzania"],
  ["Thailand", "TH", "+66", "Thai", "Kingdom of Thailand | Prathet | Ratcha Anachak Thai | TH | Thai | ประเทศไทย | ราชอาณาจักรไทย"],
  ["Timor-Leste", "TL", "+670", "East Timorese", "Democratic Republic of Timor-Leste | East Timor | República Democrática de Timor-Leste | Repúblika Demokrátika Timór-Leste | TL | Timor | Timor Lorosae | Timór Lorosa'e | Timór-Leste"],
  ["Togo", "TG", "+228", "Togolese", "République Togolaise | TG | Togolese | Togolese Republic"],
  ["Tokelau", "TK", "+690", "Tokelauan", "TK"],
  ["Tonga", "TO", "+676", "Tongan", "Kingdom of Tonga | TO"],
  ["Trinidad and Tobago", "TT", "+1868", "Trinidadian", "Republic of Trinidad and Tobago | TT"],
  ["Tunisia", "TN", "+216", "Tunisian", "Republic of Tunisia | TN | Tunisian Republic | al-Jumhūriyyah at-Tūnisiyyah | تونس"],
  ["Turkmenistan", "TM", "+993", "Turkmen", "TM | Türkmenistan | Туркмения"],
  ["Turks and Caicos Islands", "TC", "+1649", "Turks and Caicos Islander", "TC"],
  ["Tuvalu", "TV", "+688", "Tuvaluan", "TV"],
  ["Türkiye", "TR", "+90", "Turkish", "Republic of Turkey | Republic of Türkiye | TR | Turkiye | Türkiye Cumhuriyeti"],
  ["Uganda", "UG", "+256", "Ugandan", "Jamhuri ya Uganda | Republic of Uganda | UG"],
  ["Ukraine", "UA", "+380", "Ukrainian", "UA | Ukrayina | Україна"],
  ["United Arab Emirates", "AE", "+971", "Emirati", "AE | Emirates | UAE | الإمارات"],
  ["United Kingdom", "GB", "+44", "British", "GB | Great Britain | UK"],
  ["United States", "US", "+1", "American", "US | USA | United States of America"],
  ["United States Minor Outlying Islands", "UM", "+268", "American Islander", "UM"],
  ["United States Virgin Islands", "VI", "+1340", "Virgin Islander", "VI | Virgin Islands of the United States | Virgin Islands, U.S."],
  ["Uruguay", "UY", "+598", "Uruguayan", "Oriental Republic of Uruguay | República Oriental del Uruguay | UY"],
  ["Uzbekistan", "UZ", "+998", "Uzbekistani", "O‘zbekiston | O‘zbekiston Respublikasi | Republic of Uzbekistan | UZ | Ўзбекистон Республикаси | Узбекистан"],
  ["Vanuatu", "VU", "+678", "Ni-Vanuatu", "Republic of Vanuatu | Ripablik blong Vanuatu | République de Vanuatu | VU"],
  ["Vatican City", "VA", "+3", "Vatican", "Holy See (Vatican City State) | Stato della Città del Vaticano | VA | Vatican | Vatican City State | Vaticano | Vaticanæ"],
  ["Venezuela", "VE", "+58", "Venezuelan", "Bolivarian Republic of Venezuela | República Bolivariana de Venezuela | VE | Venezuela, Bolivarian Republic of"],
  ["Vietnam", "VN", "+84", "Vietnamese", "Cộng hòa Xã hội chủ nghĩa Việt Nam | Socialist Republic of Vietnam | VN | Viet Nam | Việt Nam"],
  ["Wallis and Futuna", "WF", "+681", "Wallis and Futuna Islander", "Territoire des îles Wallis et Futuna | WF | Wallis et Futuna"],
  ["Western Sahara", "EH", "+2", "Sahrawi", "EH | Sahara Occidental | Sahrawi Arab Democratic Republic | Taneẓroft Tutrimt | الصحراء الغربية"],
  ["Yemen", "YE", "+967", "Yemeni", "Republic of Yemen | YE | Yemeni Republic | al-Jumhūriyyah al-Yamaniyyah | اليمن"],
  ["Zambia", "ZM", "+260", "Zambian", "Republic of Zambia | ZM"],
  ["Zimbabwe", "ZW", "+263", "Zimbabwean", "Republic of Zimbabwe | ZW"],
  ["Åland Islands", "AX", "+35818", "Ålandish", "AX | Aaland | Ahvenanmaa | Aland | Åland"],
];

/** ZZ -> the regional-indicator flag emoji, so no images are fetched. */
function flagEmoji(cca2) {
  return cca2.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

/** Strip case and accents, and drop punctuation entirely, so "cote divoire",
 *  "Cote d'Ivoire" and "côtedivoire" all reduce to the same key. */
export function normalise(s) {
  return (s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export const COUNTRIES = ROWS.map(([name, cca2, dial, demonym, alts]) => ({
  name, cca2, dial, demonym,
  flag:    flagEmoji(cca2),
  _name:   normalise(name),
  _dem:    normalise(demonym),
  _alts:   [cca2, ...alts.split(" | ")].filter(Boolean).map(normalise),
  _digits: dial.replace(/[^0-9]/g, ""),
}));

/**
 * Search by country name, demonym, alternate spelling or dial code — so
 * "ghana", "ghanaian" and "+233" all reach Ghana.
 *
 * Ordering matters as much as matching: an exact hit on a code or alternate
 * name wins, so "uk" gives the United Kingdom rather than Ukraine, and a name
 * that starts with the query beats one that merely contains it.
 */
export function searchCountries(query, list = COUNTRIES) {
  const q = normalise(query);
  if (!q) return list;

  const digits = query.replace(/[^0-9]/g, "");
  const hits = list.filter(c =>
    c._name.includes(q) ||
    c._dem.includes(q) ||
    c._alts.some(a => a.includes(q)) ||
    (digits && c._digits.startsWith(digits))
  );

  const rank = (c) =>
      c._name === q || c._alts.includes(q) ? 0
    : c._name.startsWith(q)                ? 1
    : c._dem.startsWith(q)                 ? 2
    : 3;

  return hits.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** The country a stored value refers to, matched by name, code or demonym. */
export function findCountry(value) {
  const v = normalise(value);
  if (!v) return null;
  return COUNTRIES.find(c =>
    c._name === v || c._dem === v || c.cca2.toLowerCase() === v.toLowerCase()
  ) || null;
}
