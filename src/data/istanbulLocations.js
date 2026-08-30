/**
 * Reference data: İstanbul's 39 districts (ilçe) and their neighborhoods
 * (mahalle), used to power the cascading "Semt" -> "Mahalle" filter on the
 * Satılık/Kiralık listing pages.
 *
 * Sourced from Turkish Wikipedia district pages (tr.wikipedia.org, each
 * district's "Mahalleleri" section) as of 2026-07-28, cross-checked against
 * atlasbig.com.tr (TÜİK 2023 population/neighborhood tables), PTT postal
 * code listings (postakodu.ptt.gov.tr) and municipality sites for the
 * priority districts (Pendik, Kartal, Maltepe, Tuzla, Ataşehir). Neighborhood
 * boundaries and names occasionally change (municipal mergers/renames) —
 * worth re-verifying periodically.
 */
export const ISTANBUL_DISTRICTS = [
  {
    name: "Adalar",
    neighborhoods: ["Burgazada", "Büyükada", "Heybeliada", "Kınalıada", "Maden", "Nizam"],
  },
  {
    name: "Arnavutköy",
    neighborhoods: ["Adnan Menderes", "Anadolu", "Arnavutköy Merkez", "Atatürk", "Baklalı", "Balaban", "Boğazköy İstiklal", "Bolluca", "Boyalık", "Çilingir", "Deliklikaya", "Dursunköy", "Durusu", "Fatih", "Hacımaşlı", "Hadımköy", "Haraççı", "Hastane", "Hicret", "İmrahor", "İslambey", "Karaburun", "Karlıbayır", "Mareşal Fevzi Çakmak", "Mavigöl", "Mehmet Akif Ersoy", "Mustafa Kemal Paşa", "Nene Hatun", "Ömerli", "Sazlıbosna", "Taşoluk", "Tayakadın", "Terkos", "Yassıören", "Yavuz Selim", "Yeniköy", "Yeşilbayır", "Yunus Emre"],
  },
  {
    name: "Ataşehir",
    neighborhoods: ["Aşık Veysel", "Atatürk", "Barbaros", "Esatpaşa", "Ferhatpaşa", "Fetih", "İçerenköy", "İnönü", "Kayışdağı", "Küçükbakkalköy", "Mevlana", "Mimar Sinan", "Mustafa Kemal", "Örnek", "Yeni Çamlıca", "Yeni Sahra", "Yenişehir"],
  },
  {
    name: "Avcılar",
    neighborhoods: ["Ambarlı", "Avcılar Merkez", "Cihangir", "Denizköşkler", "Firuzköy", "Gümüşpala", "Mustafa Kemal Paşa", "Tahtakale", "Üniversite", "Yeşilkent"],
  },
  {
    name: "Bağcılar",
    neighborhoods: ["15 Temmuz", "Bağlar", "Barbaros", "Çınar", "Demirkapı", "Fatih", "Fevzi Çakmak", "Göztepe", "Güneşli", "Hürriyet", "İnönü", "Kâzım Karabekir", "Kemalpaşa", "Kirazlı", "Mahmutbey", "Merkez", "Sancaktepe", "Yavuzselim", "Yenigün", "Yenimahalle", "Yıldıztepe", "Yüzyıl"],
  },
  {
    name: "Bahçelievler",
    neighborhoods: ["Bahçelievler", "Cumhuriyet", "Çobançeşme", "Fevzi Çakmak", "Hürriyet", "Kocasinan", "Siyavuşpaşa", "Soğanlı", "Şirinevler", "Yenibosna", "Zafer"],
  },
  {
    name: "Bakırköy",
    neighborhoods: ["Ataköy 1. Kısım", "Ataköy 2-5-6. Kısım", "Ataköy 3-4-11. Kısım", "Ataköy 7-8-9-10. Kısım", "Basınköy", "Cevizlik", "Kartaltepe", "Osmaniye", "Sakızağacı", "Şenlikköy", "Yenimahalle", "Yeşilköy", "Yeşilyurt", "Zeytinlik", "Zuhuratbaba"],
  },
  {
    name: "Başakşehir",
    neighborhoods: ["Altınşehir", "Bahçeşehir 1. Kısım", "Bahçeşehir 2. Kısım", "Başak", "Başakşehir", "Güvercintepe", "İkitelli OSB", "Kayabaşı", "Şahintepe", "Şamlar", "Ziya Gökalp"],
  },
  {
    name: "Bayrampaşa",
    neighborhoods: ["Altıntepsi", "Cevatpaşa", "İsmetpaşa", "Kartaltepe", "Kocatepe", "Muratpaşa", "Orta", "Terazidere", "Vatan", "Yenidoğan", "Yıldırım"],
  },
  {
    name: "Beşiktaş",
    neighborhoods: ["Abbasağa", "Akat", "Arnavutköy", "Balmumcu", "Bebek", "Cihannüma", "Dikilitaş", "Etiler", "Gayrettepe", "Konaklar", "Kuruçeşme", "Kültür", "Levazım", "Levent", "Mecidiye", "Muradiye", "Nisbetiye", "Ortaköy", "Sinanpaşa", "Türkali", "Ulus", "Vişnezade", "Yıldız"],
  },
  {
    name: "Beykoz",
    neighborhoods: ["Acarlar", "Akbaba", "Alibahadır", "Anadolu Hisarı", "Anadolu Kavağı", "Anadolufeneri", "Baklacı", "Bozhane", "Cumhuriyet", "Çamlıbahçe", "Çengeldere", "Çiftlik", "Çiğdem", "Çubuklu", "Dereseki", "Elmalı", "Fatih", "Göksu", "Göllü", "Görele", "Göztepe", "Gümüşsuyu", "İncirköy", "İshaklı", "Kanlıca", "Kavacık", "Kaynarca", "Kılıçlı", "Mahmutşevketpaşa", "Merkez", "Ortaçeşme", "Öğümce", "Örnekköy", "Paşabahçe", "Paşamandıra", "Polonezköy", "Poyrazköy", "Riva", "Rüzgarlıbahçe", "Soğuksu", "Tokatköy", "Yalıköy", "Yavuzselim", "Yenimahalle", "Zerzevatçı"],
  },
  {
    name: "Beylikdüzü",
    neighborhoods: ["Adnan Kahveci", "Barış", "Büyükşehir", "Cumhuriyet", "Dereağzı", "Gürpınar", "Kavaklı", "Marmara", "Sahil", "Yakuplu"],
  },
  {
    name: "Beyoğlu",
    neighborhoods: ["Arap Cami", "Asmalı Mescit", "Bedrettin", "Bereketzade", "Bostan", "Bülbül", "Camiikebir", "Cihangir", "Çatma Mescit", "Çukur", "Emekyemez", "Evliya Çelebi", "Fetihtepe", "Firuzağa", "Gümüşsuyu", "Hacıahmet", "Hacımimi", "Halıcıoğlu", "Hüseyinağa", "İstiklal", "Kadımehmet Efendi", "Kalyoncukulluk", "Kamerhatun", "Kaptanpaşa", "Katip Mustafa Çelebi", "Keçecipiri", "Kemankeş Karamustafapaşa", "Kılıçali Paşa", "Kocatepe", "Kulaksız", "Kuloğlu", "Küçük Piyale", "Müeyyetzade", "Ömeravni", "Örnektepe", "Piripaşa", "Piyalepaşa", "Pürtelaş Hasan Efendi", "Sururi Mehmet Efendi", "Sütlüce", "Şahkulu", "Şehit Muhtar", "Tomtom", "Yahya Kâhya", "Yenişehir"],
  },
  {
    name: "Büyükçekmece",
    neighborhoods: ["19 Mayıs", "Ahmediye", "Alkent 2000", "Atatürk", "Bahçelievler", "Celaliye", "Cumhuriyet", "Çakmaklı", "Dizdariye", "Ekinoba", "Fatih", "Güzelce", "Hürriyet", "Kamiloba", "Karaağaç", "Kumburgaz", "Mimaroba", "Mimarsinan", "Murat Çeşme", "Pınartepe", "Sinanoba", "Türkoba", "Ulus", "Yenimahalle"],
  },
  {
    name: "Çatalca",
    neighborhoods: ["Akalan", "Atatürk", "Aydınlar", "Bahşayiş", "Başak", "Belgrat", "Celepköy", "Çakıl", "Çanakça", "Çiftlikköy", "Dağyenice", "Elbasan", "Fatih", "Ferhatpaşa", "Gökçeali", "Gümüşpınar", "Hallaçlı", "Hisarbeyli", "İhsaniye", "İnceğiz", "İzzettin", "Kabakça", "Kaleiçi", "Kalfa", "Karacaköy Merkez", "Karamandere", "Kestanelik", "Kızılcaali", "Muratbey Merkez", "Nakkaş", "Oklalı", "Ormanlı", "Ovayenice", "Örcünlü", "Örencik", "Subaşı", "Yalıköy", "Yaylacık", "Yazlık"],
  },
  {
    name: "Çekmeköy",
    neighborhoods: ["Alemdağ", "Aydınlar", "Cumhuriyet", "Çamlık", "Çatalmeşe", "Ekşioğlu", "Güngören", "Hamidiye", "Hüseyinli", "Kirazlıdere", "Koçullu", "Mehmet Akif", "Merkez", "Mimar Sinan", "Nişantepe", "Ömerli", "Reşadiye", "Sırapınar", "Soğukpınar", "Sultançiftliği", "Taşdelen"],
  },
  {
    name: "Esenler",
    neighborhoods: ["15 Temmuz", "Atışalanı", "Birlik", "Çiftehavuzlar", "Davutpaşa", "Fatih", "Fevzi Çakmak", "Kazım Karabekir", "Kemer", "Menderes", "Mimar Sinan", "Namık Kemal", "Nine Hatun", "Oruçreis", "Tuna", "Turgutreis", "Yavuz Selim"],
  },
  {
    name: "Esenyurt",
    neighborhoods: ["Akçaburgaz", "Akevler", "Akşemseddin", "Ardıçlı", "Aşık Veysel", "Atatürk", "Bağlarçeşme", "Balıkyolu", "Barbaros Hayrettin Paşa", "Battalgazi", "Cumhuriyet", "Çınar", "Esenkent", "Fatih", "Gökevler", "Güzelyurt", "Hürriyet", "İncirtepe", "İnönü", "İstiklal", "Koza", "Mehmet Akif Ersoy", "Mehterçeşme", "Mevlana", "Namık Kemal", "Necip Fazıl Kısakürek", "Orhan Gazi", "Osmangazi", "Örnek", "Pınar", "Piri Reis", "Saadetdere", "Selahaddin Eyyubi", "Sultaniye", "Süleymaniye", "Şehitler", "Talatpaşa", "Turgut Özal", "Üçevler", "Yenikent", "Yeşilkent", "Yunus Emre", "Zafer"],
  },
  {
    name: "Eyüpsultan",
    neighborhoods: ["5. Levent", "Ağaçlı", "Akpınar", "Akşemsettin", "Alibeyköy", "Çırçır", "Çiftalan", "Defterdar", "Düğmeciler", "Emniyettepe", "Esentepe", "Göktürk", "Güzeltepe", "Işıklar", "İhsaniye", "İslambey", "Karadolap", "Merkez", "Mimar Sinan", "Mithatpaşa", "Nişanca", "Odayeri", "Pirinççi", "Rami Cuma", "Rami Yeni", "Sakarya", "Silahtarağa", "Topçular", "Yeşilpınar"],
  },
  {
    name: "Fatih",
    neighborhoods: ["Aksaray", "Akşemsettin", "Alemdar", "Ali Kuşçu", "Atikali", "Ayvansaray", "Balabanağa", "Balat", "Beyazıt", "Binbirdirek", "Cankurtaran", "Cerrahpaşa", "Cibali", "Demirtaş", "Derviş Ali", "Eminsinan", "Hacıkadın", "Haseki Sultan", "Hırka-i Şerif", "Hobyar", "Hoca Gıyasettin", "Hocapaşa", "İskenderpaşa", "Kalenderhane", "Karagümrük", "Katip Kasım", "Kemalpaşa", "Kocamustafapaşa", "Küçükayasofya", "Mercan", "Mesihpaşa", "Mevlanakapı", "Mimar Hayrettin", "Mimar Kemalettin", "Molla Fenari", "Molla Gürani", "Molla Hüsrev", "Muhsinehatun", "Nişanca", "Rüstempaşa", "Saraç İshak", "Sarıdemir", "Seyyid Ömer", "Silivrikapı", "Sultanahmet", "Sururi", "Süleymaniye", "Sümbülefendi", "Şehremini", "Şehsuvarbey", "Tahtakale", "Tayahatun", "Topkapı", "Yavuz Sultan Selim", "Yavuzsinan", "Yedikule", "Zeyrek"],
  },
  {
    name: "Gaziosmanpaşa",
    neighborhoods: ["Bağlarbaşı", "Barbaros Hayrettin Paşa", "Fevzi Çakmak", "Hürriyet", "Karadeniz", "Karayolları", "Karlıtepe", "Kazım Karabekir", "Merkez", "Mevlana", "Pazariçi", "Sarıgöl", "Şemsipaşa", "Yeni Mahalle", "Yenidoğan", "Yıldıztabya"],
  },
  {
    name: "Güngören",
    neighborhoods: ["Abdurrahman Nafiz Gürman", "Akıncılar", "Gençosman", "Güneştepe", "Güven", "Haznedar", "Mareşal Çakmak", "Mehmet Nesih Özmen", "Merkez", "Sanayi", "Tozkoparan"],
  },
  {
    name: "Kadıköy",
    neighborhoods: ["19 Mayıs", "Acıbadem", "Bostancı", "Caddebostan", "Caferağa", "Dumlupınar", "Eğitim", "Erenköy", "Fenerbahçe", "Feneryolu", "Fikirtepe", "Göztepe", "Hasanpaşa", "Koşuyolu", "Kozyatağı", "Merdivenköy", "Osmanağa", "Rasimpaşa", "Sahrayıcedid", "Suadiye", "Zühtüpaşa"],
  },
  {
    name: "Kağıthane",
    neighborhoods: ["Çağlayan", "Çeliktepe", "Emniyet Evleri", "Gültepe", "Gürsel", "Hamidiye", "Harmantepe", "Hürriyet", "Mehmet Akif Ersoy", "Merkez", "Nurtepe", "Ortabayır", "Seyrantepe", "Sultan Selim", "Şirintepe", "Talatpaşa", "Telsizler", "Yahya Kemal", "Yeşilce"],
  },
  {
    name: "Kartal",
    neighborhoods: ["Atalar", "Cevizli", "Cumhuriyet", "Çavuşoğlu", "Esentepe", "Gümüşpınar", "Hürriyet", "Karlıktepe", "Kordonboyu", "Orhantepe", "Orta", "Petrol İş", "Soğanlık Yeni", "Topselvi", "Uğur Mumcu", "Yakacık Çarşı", "Yakacık Yeni", "Yalı", "Yukarı", "Yunus"],
  },
  {
    name: "Küçükçekmece",
    neighborhoods: ["Atakent", "Atatürk", "Beşyol", "Cennet", "Cumhuriyet", "Fatih", "Fevzi Çakmak", "Gültepe", "Halkalı Merkez", "İnönü", "İstasyon", "Kanarya", "Kartaltepe", "Kemalpaşa", "Mehmet Akif", "Söğütlüçeşme", "Sultanmurat", "Tevfikbey", "Yarımburgaz", "Yenimahalle", "Yeşilova"],
  },
  {
    name: "Maltepe",
    neighborhoods: ["Altayçeşme", "Altıntepe", "Aydınevler", "Bağlarbaşı", "Başıbüyük", "Büyükbakkalköy", "Cevizli", "Çınar", "Esenkent", "Feyzullah", "Fındıklı", "Girne", "Gülensu", "Gülsuyu", "İdealtepe", "Küçükyalı Merkez", "Yalı", "Zümrütevler"],
  },
  {
    name: "Pendik",
    neighborhoods: ["Ahmet Yesevi", "Bahçelievler", "Ballıca", "Batı", "Çamçeşme", "Çamlık", "Çınardere", "Doğu", "Dumlupınar", "Emirli", "Ertuğrul Gazi", "Esenler", "Esenyalı", "Fatih", "Fevzi Çakmak", "Göçbeyli", "Güllü Bağlar", "Güzelyalı", "Harmandere", "Kavakpınar", "Kaynarca", "Kurna", "Kurtdoğmuş", "Kurtköy", "Orhangazi", "Orta", "Ramazanoğlu", "Sanayi", "Sapan Bağları", "Sülüntepe", "Şeyhli", "Velibaba", "Yayalar", "Yeni", "Yenişehir", "Yeşilbağlar"],
  },
  {
    name: "Sancaktepe",
    neighborhoods: ["Abdurrahmangazi", "Akpınar", "Atatürk", "Emek", "Eyüp Sultan", "Fatih", "Hilal", "İnönü", "Kemal Türkler", "Meclis", "Merve", "Mevlana", "Osmangazi", "Paşaköy", "Safa", "Sarıgazi", "Veysel Karani", "Yenidoğan", "Yunus Emre"],
  },
  {
    name: "Sarıyer",
    neighborhoods: ["Ayazağa", "Bahçeköy Kemer", "Bahçeköy Merkez", "Bahçeköy Yeni", "Baltalimanı", "Büyükdere", "Cumhuriyet", "Çamlıtepe", "Çayırbaşı", "Darüşşafaka", "Demirciköy", "Emirgân", "Fatih Sultan Mehmet", "Ferahevler", "Garipçe", "Gümüşdere", "Huzur", "İstinye", "Kâzım Karabekir Paşa", "Kısırkaya", "Kilyos", "Kireçburnu", "Kocataş", "Maden", "Maslak", "Pınar", "Poligon", "PTT Evleri", "Reşitpaşa", "Rumelifeneri", "Rumelihisarı", "Rumelikavağı", "Sarıyer Merkez", "Tarabya", "Uskumruköy", "Yeni", "Yeniköy", "Zekeriyaköy"],
  },
  {
    name: "Silivri",
    neighborhoods: ["Akören", "Alibey", "Alipaşa", "Bekirli", "Beyciler", "Büyük Çavuşlu", "Büyük Kılıçlı", "Büyük Sinekli", "Cumhuriyet", "Çanta Balaban", "Çanta Sancaktepe", "Çayırdere", "Çeltik", "Danamandıra", "Değirmenköy Fevzipaşa", "Değirmenköy İsmetpaşa", "Fatih", "Fener", "Gazitepe", "Gümüşyaka", "Kadıköy", "Kavaklı Hürriyet", "Kavaklı İstiklal", "Kurfallı", "Küçük Kılıçlı", "Küçük Sinekli", "Mimar Sinan", "Ortaköy", "Piri Mehmet Paşa", "Sayalar", "Selimpaşa", "Semizkumlar", "Seymen", "Yeni", "Yolçatı"],
  },
  {
    name: "Sultanbeyli",
    neighborhoods: ["Abdurrahmangazi", "Adil", "Ahmet Yesevi", "Akşemsettin", "Battalgazi", "Fatih", "Hamidiye", "Hasanpaşa", "Mecidiye", "Mehmet Akif", "Mimar Sinan", "Necip Fazıl", "Orhangazi", "Turgut Reis", "Yavuz Selim"],
  },
  {
    name: "Sultangazi",
    neighborhoods: ["50. Yıl", "75. Yıl", "Cebeci", "Cumhuriyet", "Esentepe", "Eski Habipler", "Gazi", "Habibler", "İsmetpaşa", "Malkoçoğlu", "Sultançiftliği", "Uğur Mumcu", "Yayla", "Yunus Emre", "Zübeyde Hanım"],
  },
  {
    name: "Şile",
    neighborhoods: ["Ağaçdere", "Ağva Merkez", "Ahmetli", "Akçakese", "Alacalı", "Avcıkoru", "Balibey", "Bıçkıdere", "Bozgoca", "Bucaklı", "Çataklı", "Çavuş", "Çayırbaşı", "Çelebi", "Çengilli", "Darlık", "Değirmençayırı", "Doğancılı", "Erenler", "Esenceli", "Geredeli", "Göçe", "Gökmaşlı", "Göksu", "Hacıkasım", "Hacıllı", "Hasanlı", "İmrendere", "İmrenli", "İsaköy", "Kabakoz", "Kadıköy", "Kalem", "Karabeyli", "Karacaköy", "Karakiraz", "Karamandere", "Kervansaray", "Kızılca", "Korucu", "Kömürlük", "Kumbaba", "Kurfallı", "Kurna", "Meşrutiyet", "Oruçoğlu", "Osmanköy", "Ovacık", "Sahilköy", "Satmazlı", "Sofular", "Soğullu", "Sortullu", "Şuayipli", "Teke", "Ulupelit", "Üvezli", "Yaka", "Yaylalı", "Yazımanayır", "Yeniköy", "Yeşilvadi"],
  },
  {
    name: "Şişli",
    neighborhoods: ["19 Mayıs", "Bozkurt", "Cumhuriyet", "Duatepe", "Ergenekon", "Esentepe", "Eskişehir", "Feriköy", "Fulya", "Gülbahar", "Halaskargazi", "Halide Edib Adıvar", "Halil Rıfat Paşa", "Harbiye", "İnönü", "İzzetpaşa", "Kaptanpaşa", "Kuştepe", "Mahmut Şevket Paşa", "Mecidiyeköy", "Merkez", "Meşrutiyet", "Paşa", "Teşvikiye", "Yayla"],
  },
  {
    name: "Tuzla",
    neighborhoods: ["Akfırat", "Anadolu", "Aydınlı", "Aydıntepe", "Cami", "Evliya Çelebi", "Fatih", "İçmeler", "İstasyon", "Mescit", "Mimar Sinan", "Orhanlı", "Orta", "Postane", "Şifa", "Tepeören", "Yayla"],
  },
  {
    name: "Ümraniye",
    neighborhoods: ["Adem Yavuz", "Altınşehir", "Armağanevler", "Aşağıdudullu", "Atakent", "Atatürk", "Cemil Meriç", "Çakmak", "Çamlık", "Dumlupınar", "Elmalıkent", "Esenevler", "Esenkent", "Esenşehir", "Fatih Sultan Mehmet", "Finanskent", "Hekimbaşı", "Huzur", "Ihlamurkuyu", "İnkılap", "İstiklal", "Kâzım Karabekir", "Madenler", "Mehmet Akif", "Namık Kemal", "Necip Fazıl", "Parseller", "Site", "Şerifali", "Tantavi", "Tatlısu", "Tepeüstü", "Topağacı", "Yamanevler", "Yukarıdudullu"],
  },
  {
    name: "Üsküdar",
    neighborhoods: ["Acıbadem", "Ahmediye", "Altunizade", "Aziz Mahmut Hüdayi", "Bahçelievler", "Barbaros", "Beylerbeyi", "Bulgurlu", "Burhaniye", "Cumhuriyet", "Çengelköy", "Ferah", "Güzeltepe", "İcadiye", "Kandilli", "Kısıklı", "Kirazlıtepe", "Kuleli", "Kuzguncuk", "Küçük Çamlıca", "Küçüksu", "Küplüce", "Mehmet Akif Ersoy", "Mimar Sinan", "Muratreis", "Salacak", "Selami Ali", "Selimiye", "Sultantepe", "Ünalan", "Valide-i Atik", "Yavuztürk", "Zeynep Kamil"],
  },
  {
    name: "Zeytinburnu",
    neighborhoods: ["Beştelsiz", "Çırpıcı", "Gökalp", "Kazlıçeşme", "Maltepe", "Merkezefendi", "Nuripaşa", "Seyitnizam", "Sümer", "Telsiz", "Veliefendi", "Yenidoğan", "Yeşiltepe"],
  },
];
