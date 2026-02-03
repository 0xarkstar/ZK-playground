// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay  = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1  = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2  = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1  = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2  = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 18439794218664518831115092706102951509032208340603756848504925920016412845128;
    uint256 constant deltax2 = 5115546496829027241240365253605352726810163442091821007737023079194696758648;
    uint256 constant deltay1 = 18848473653265226339651840912665621959969288259187908620194989603867153312286;
    uint256 constant deltay2 = 21162574640024164882731507850247349914942967588032212996361251950258748026748;

    
    uint256 constant IC0x = 19122646358974755221035136398825559573212782293530271382833488093132028523714;
    uint256 constant IC0y = 19935804601204851752744033789205124051726687913636196976288763890482330395889;
    
    uint256 constant IC1x = 6614617681308216135114431239027590409827433519412365109342207142353502465909;
    uint256 constant IC1y = 13558939796261486901023426636868300273595037686471322591029129811890781243456;
    
    uint256 constant IC2x = 21516485909377117738410776469643732078966002616856192431713439461266341527224;
    uint256 constant IC2y = 11126829345382524575547400034410897903770319173120969849286581598624379424970;
    
    uint256 constant IC3x = 10161224294952537605116215683818427683365382333160266364209845292494996974465;
    uint256 constant IC3y = 13685970535382987270316802118658665793467279045469821093276034042043000786845;
    
    uint256 constant IC4x = 13111925759632423525332022870660239638513370086257934399018209556602780123688;
    uint256 constant IC4y = 8567709122058699120481802128559224688054322142063938713754893556243100076365;
    
    uint256 constant IC5x = 16831118958140208727561640938847397398713227297011407201352723254476325943059;
    uint256 constant IC5y = 15869956365754261099080694182068032600754585124158218337591986783508016183606;
    
    uint256 constant IC6x = 5467877191646080767795364641425440692738191902110804096371717522277843248235;
    uint256 constant IC6y = 6567395721097239690177699980071586432377902122895344639962562907642840591993;
    
    uint256 constant IC7x = 2304262525949028382789838977612164788841646957107633475006723044727888389509;
    uint256 constant IC7y = 19590307846929982713129264491075751369286137601520640626841963994821141769654;
    
    uint256 constant IC8x = 7326585982537770721775946151263533766167352365303297487549035546737100205027;
    uint256 constant IC8y = 15698828587354403061484605130732193897126466480572054599754745717586280049123;
    
    uint256 constant IC9x = 3302908101883017960016216375250238897774283578311928135320451866941146425349;
    uint256 constant IC9y = 131642678965295791064239430986955491401439094325125492515062798879765934145;
    
    uint256 constant IC10x = 15327396895684333107321099967005863268671324850466003828025286876061219192953;
    uint256 constant IC10y = 882902277874126062346151462228793717292140974061514235793035167486793613848;
    
    uint256 constant IC11x = 1063853336540753904288091048312618833536447501447563683392869610642537231067;
    uint256 constant IC11y = 9384989135419763246592644144293663669933077842158944873307829018473958661231;
    
    uint256 constant IC12x = 17423561318053761885153500444492658194015676444722875097223059643446384639905;
    uint256 constant IC12y = 18839826119148491361746557266647676715623442256156991567564058137868182318707;
    
    uint256 constant IC13x = 10279568701855956595913292051604865107028292281164446268455078094166516791675;
    uint256 constant IC13y = 19426596890183236050209773458863035301773860191897091259442841623280804291357;
    
    uint256 constant IC14x = 9673918363885276552045958325773126168100327558938173041547736491567377175793;
    uint256 constant IC14y = 20135911343960700007921050235887638660346800804021444132724976998578228279290;
    
    uint256 constant IC15x = 10385405349048345587648641833412473178998023621800710831493945234739481644817;
    uint256 constant IC15y = 19233889380610677696608153947871545745249270242513573356047111399293739780280;
    
    uint256 constant IC16x = 20363742260688440298272266699580836069525457279008807391810363556144267867505;
    uint256 constant IC16y = 11271405217667296161302671976774703488176569147274724165380373215321035893016;
    
    uint256 constant IC17x = 17208950820144470134581938668696716894081841922111746119933580670455374885437;
    uint256 constant IC17y = 10836484772436899723733259798536296052078841615622196849830808045329792285997;
    
    uint256 constant IC18x = 8715871099685035307034834553970906740895943979761381036456006676965241983287;
    uint256 constant IC18y = 1005895918000446309779762933611653488890702721885346037541379856206827277717;
    
    uint256 constant IC19x = 1255290283675923691509695694479786315532448743037455680312409165601410162538;
    uint256 constant IC19y = 6450881842560726109960903499875458879870514423706702675038781649074585524127;
    
    uint256 constant IC20x = 20129746662266504572196828195127953025039056688658325706643836849005384333783;
    uint256 constant IC20y = 2287470640383180904438185018194360214120227372876694503363077616387000465817;
    
    uint256 constant IC21x = 19640455575310174430557858916406727276122476511001633580208918701754175036871;
    uint256 constant IC21y = 16684221825336093069577543243862964547946347792385116691946236369045792718213;
    
    uint256 constant IC22x = 16397656568611472603089312619513113085604329576066756105934189773229867550645;
    uint256 constant IC22y = 20798993229006540590719162384905059572069930279825694824737498460488979433262;
    
    uint256 constant IC23x = 13085853195133488181941993090279223285975658573451348105210180031879144457399;
    uint256 constant IC23y = 4625194289720883094243182676760962601171105303405228422755701269254902953372;
    
    uint256 constant IC24x = 10446316734513859307527698482569367362360305727617587496946228550061147235688;
    uint256 constant IC24y = 10570843156780551243768296895596164540632968077387836180855347339118220373614;
    
    uint256 constant IC25x = 2098435821818201444984785456138112764168886938113227443312383593220668980904;
    uint256 constant IC25y = 16291129317170987261691925510305659316709504138140759095891010877940121347323;
    
    uint256 constant IC26x = 7002691512804147665684350400683840649511383545135150500485305777990417536147;
    uint256 constant IC26y = 1556441084952250467025674022568560611459569250940410653388464867729390184109;
    
    uint256 constant IC27x = 459212984972577233941738760406036807513673723202117494697952650759854372819;
    uint256 constant IC27y = 8802978055901870939029453763030690192688571350859703557063434413156426804318;
    
    uint256 constant IC28x = 20043580896122791132973633241771872280142130706321103170311982796436717972444;
    uint256 constant IC28y = 7668854549712386467703803900574909838446629767909072373321828540093823984020;
    
    uint256 constant IC29x = 4420168238804135003972393399234200765841886340712574747157492032138074331993;
    uint256 constant IC29y = 11851838894590558365130231121247360126922803865363998335855419387420253163505;
    
    uint256 constant IC30x = 262812837848411952675610271507041755466808404278835630205825872091346373017;
    uint256 constant IC30y = 495348164218569755921106633277675345992431158317219823187744332893425225695;
    
    uint256 constant IC31x = 8119014568003397717692845141278705607629170462015140933376887555579322154593;
    uint256 constant IC31y = 14221386043577233550044073890976609934259292816146220820191348659082818656398;
    
    uint256 constant IC32x = 16495298311631924365543909121660777567536178607878828767797523792961981989670;
    uint256 constant IC32y = 12058134319783630788880667942278099706244196469715481629604815318466633309090;
    
    uint256 constant IC33x = 1894929932360850509561357342253000725297329028000372943518151927311913318219;
    uint256 constant IC33y = 1245331919104446936001058464011838142559787540884672579650312869051084712331;
    
    uint256 constant IC34x = 14080715625792886714446160407043259831911477965184548404567200126572089719586;
    uint256 constant IC34y = 18355080115895554512409431436130634532775960060684212352196843553519615472798;
    
    uint256 constant IC35x = 10056659291917921684750530027098948822934350136138296646521596641648277221712;
    uint256 constant IC35y = 11162652531472577433178520770392906055438942493599659931196988795907535547815;
    
    uint256 constant IC36x = 15793276380369065338145674945557975106878077985337578580389854964574847154466;
    uint256 constant IC36y = 15312890341214212296730355169552905230687639571197337052502493734744010281071;
    
    uint256 constant IC37x = 6252397611530756525390702445105077723551054188653003214979206479524888889470;
    uint256 constant IC37y = 3811007617037317271441460648639091019903226574044506350199565583813585054606;
    
    uint256 constant IC38x = 2629676613286299872898124389230119249193837328575943546515476017810286277336;
    uint256 constant IC38y = 13242720926801302983413101340406994209924893821688906584107288858162191860247;
    
    uint256 constant IC39x = 2771375102158291061978596551158615977261920265790252093796339384123119238060;
    uint256 constant IC39y = 10040705548102937210758016838572948780667874857170044386985448411880932246325;
    
    uint256 constant IC40x = 13819052288173380678305219981101455289209247189633768246061328224542435020328;
    uint256 constant IC40y = 15833077769942072821319976050096233124866314284378862593995068101052677512661;
    
    uint256 constant IC41x = 543539023982764782322895509143530397301759950497555989552649557840167607221;
    uint256 constant IC41y = 2834379271357278271083518815015411419803617621663641181320148232025414833243;
    
    uint256 constant IC42x = 19460088639375808950593067262893215688693569949145106956922727573035495862449;
    uint256 constant IC42y = 15111337268113691808285728214516858963446932997742913228249396329845357671640;
    
    uint256 constant IC43x = 19513166568216485202626036735324287827574846127313059487304183708729124203022;
    uint256 constant IC43y = 2412836835203008629924080407323179854729214275865034438897640228761577435877;
    
    uint256 constant IC44x = 8473274615942507275453330542376131736101932630448234645141770847344351063528;
    uint256 constant IC44y = 19554530337472532608054966756317810512818465849153307063892689804145224369969;
    
    uint256 constant IC45x = 16506701427324302906392908516421927230677617316221279861271463395224845134721;
    uint256 constant IC45y = 12798343610719070170508905974177431982481238646091530687825382849440281785152;
    
    uint256 constant IC46x = 12882343355032300646481571116825798914645194523522059170639116850903672052050;
    uint256 constant IC46y = 11431590954451907181554597168552361177256859382304555310165434764711712447316;
    
    uint256 constant IC47x = 7526716669018270776931388346306667767365152382114776775219580652430875016251;
    uint256 constant IC47y = 19609951239040000883545291522123717673798918671227712696336073240287692739377;
    
    uint256 constant IC48x = 3812856877604865985332326352871288005462705411439557862909550672084005356196;
    uint256 constant IC48y = 8297043683600859597653326602418203114391458640253375062058267214806087046593;
    
    uint256 constant IC49x = 18213165060665340657335236115837876439231316573223180356196018037241470459527;
    uint256 constant IC49y = 1066558036162483777275593674943634146306889284473683450886398184107110315721;
    
    uint256 constant IC50x = 13009966644631371705360162784211471703055135949218907297532093366576381739468;
    uint256 constant IC50y = 12976107642450180641470023564031521493738920167654326309020201118338156763806;
    
    uint256 constant IC51x = 21333507463741909245303360426705989506532291752994423653516869848038762532492;
    uint256 constant IC51y = 16863854795581557701792869793499562891529756549090709272347189618807805781137;
    
    uint256 constant IC52x = 19323722373587882591197337544263789089564956866302475148289951771173219771872;
    uint256 constant IC52y = 122732480908625322676709357691465234024615983929861850893935883707832127325;
    
    uint256 constant IC53x = 19787925292425617958285107116135775537569173991390830156802965670726816281514;
    uint256 constant IC53y = 10878148598463277143196464055549232404515296461160331935229089447558124959023;
    
    uint256 constant IC54x = 10769444021771474836924760111866706191274039492463578057312938333832444390577;
    uint256 constant IC54y = 4000746909396540719619428077579777602601870367887848338450311204615841022730;
    
    uint256 constant IC55x = 4863010071416801261652106313132542866507562955529960450145486494645155270383;
    uint256 constant IC55y = 6765002255126890994315938235553944613961989317314129920062948043478469595039;
    
    uint256 constant IC56x = 3467388289355415969771604527297966378960598133234646874805782376006746483223;
    uint256 constant IC56y = 8160541887887123663428137557763400145335796423087565192731232433974527394917;
    
    uint256 constant IC57x = 8630805755565764746244392303545005156752854354224147751639408377505267424247;
    uint256 constant IC57y = 20215141150786253995068201755890087165034646582845629518835141601547104386682;
    
    uint256 constant IC58x = 17618780495760552497376847444411553931489723655281483323611041650898325739587;
    uint256 constant IC58y = 16850279677066390224408403079286862269657772982880744925707037239515669026186;
    
    uint256 constant IC59x = 4877370594634463629700922777056765935386714814371643815186235895486591620919;
    uint256 constant IC59y = 8531026960408275713537004116280566471741811988405069921752246409142446762976;
    
    uint256 constant IC60x = 6457123728359495269656598648893298347298604559921636252569474288602666870455;
    uint256 constant IC60y = 8440818813064724887036934234995585299307108633808190227519767177206799246277;
    
    uint256 constant IC61x = 5154556651983306939578337072460260453991056598253072103495633003574724948020;
    uint256 constant IC61y = 18933647418442303845089008437398628423885826342361912001395534497127405910862;
    
    uint256 constant IC62x = 131058954083323357043614221114024043804592740188119337682593843139708447008;
    uint256 constant IC62y = 4279590902403652499340971443730104497483575122634351485508033466501828506088;
    
    uint256 constant IC63x = 3131217841738318468272253065555900115220882280067450593306358420877275129206;
    uint256 constant IC63y = 12341308665215566031912714047938250575470072015969581730982381509194691935768;
    
    uint256 constant IC64x = 11036577582614482729075932148211246355588437608606179637488562659592811275402;
    uint256 constant IC64y = 12253399988593358287851640299502304403445075835887333285896547742522228576459;
    
    uint256 constant IC65x = 3849226165822186270491191247388448390637384640780071423663430987225176191181;
    uint256 constant IC65y = 14105775844274035170201054418132890619619243959741133060171992953385656493378;
    
    uint256 constant IC66x = 3559949432536213247437699170079175006170307317557394538317006078849196773463;
    uint256 constant IC66y = 759900816590564932131261207464891823249923299621425351930551351098172228723;
    
    uint256 constant IC67x = 17111015447732395740656654076917013992222078207546847297684310283321220664270;
    uint256 constant IC67y = 21790862754381671426692710602046527351941982709358144703974876993401040781482;
    
    uint256 constant IC68x = 16282505182076237440588232674802635131659231402723939140676891425128321614563;
    uint256 constant IC68y = 12569839330809228042594436599807503618410368053537871688488915075637913149237;
    
    uint256 constant IC69x = 360933660439836998521864761001494856774460539895853355955748712667258288482;
    uint256 constant IC69y = 15717921110131009258357542669968637863147195700178005778328154082506274772135;
    
    uint256 constant IC70x = 20820146676314333956670387800772230630350607452635797660969806432949254195965;
    uint256 constant IC70y = 12193560504616728152636458271755867277880039817347255392098107263241175017430;
    
    uint256 constant IC71x = 631311314934764064707774772016378223635183169856255079063506859874848755265;
    uint256 constant IC71y = 16868555129232902938289525218741251214909490308618864265412900869344978272556;
    
    uint256 constant IC72x = 14459851472249164277235939984181058314624584727204886753279687042822630453498;
    uint256 constant IC72y = 11831066120327440068913178729487785945876551305269197646981363632010848893816;
    
    uint256 constant IC73x = 1452189339966954058148398214297244071073841435079800179008308592008137406038;
    uint256 constant IC73y = 8745019984000163516991481565267451288118750644754505206052455957368849121810;
    
    uint256 constant IC74x = 1771556752091270458199117660495787115399210545793207809630908362212072274264;
    uint256 constant IC74y = 18167789049846773687852562779392680776451008537878035792897503528427277026531;
    
    uint256 constant IC75x = 17414613858732785489879185100934573937438830507477212201285127065059656955171;
    uint256 constant IC75y = 15015288165133605853242772909328009688321028393201341975774574226943814629181;
    
    uint256 constant IC76x = 20176497365864567590104603253032113515472621730317146371116670021303963064807;
    uint256 constant IC76y = 2733760355296259430824231748523024026965528457887276919356732664683607887363;
    
    uint256 constant IC77x = 3806978680212170936754450115334107276250404751626160576161425221852124476419;
    uint256 constant IC77y = 3922268497174936108453440103395229969880565211743741266159666018094681161833;
    
    uint256 constant IC78x = 6787538315021804149770180166363105603767173976904231371190987833240444105650;
    uint256 constant IC78y = 17503445936512727375655505082353463306370197632674216007164166828371319889810;
    
    uint256 constant IC79x = 7115551947970889256674542286918692789825576996346468846880855312753828406299;
    uint256 constant IC79y = 15170528461776869923804150170534280897251332738996696335721638009613145686844;
    
    uint256 constant IC80x = 1818194827153928765318008421704151417646004000031373527180945372726905431934;
    uint256 constant IC80y = 3068622357196390558034890549442248631899667503081732421820895938430403746664;
    
    uint256 constant IC81x = 15390807941663940210137375237562369217813491249842111701554602206709534467872;
    uint256 constant IC81y = 7829747348363717720703050791050170982490086813278274357227318785582078961494;
    
    uint256 constant IC82x = 20334103942325491526157534070028809890403931076899597187940488255039138875766;
    uint256 constant IC82y = 95533112784853008499601757592853335730422482351147739890432813659024538645;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[82] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                
                g1_mulAccC(_pVk, IC24x, IC24y, calldataload(add(pubSignals, 736)))
                
                g1_mulAccC(_pVk, IC25x, IC25y, calldataload(add(pubSignals, 768)))
                
                g1_mulAccC(_pVk, IC26x, IC26y, calldataload(add(pubSignals, 800)))
                
                g1_mulAccC(_pVk, IC27x, IC27y, calldataload(add(pubSignals, 832)))
                
                g1_mulAccC(_pVk, IC28x, IC28y, calldataload(add(pubSignals, 864)))
                
                g1_mulAccC(_pVk, IC29x, IC29y, calldataload(add(pubSignals, 896)))
                
                g1_mulAccC(_pVk, IC30x, IC30y, calldataload(add(pubSignals, 928)))
                
                g1_mulAccC(_pVk, IC31x, IC31y, calldataload(add(pubSignals, 960)))
                
                g1_mulAccC(_pVk, IC32x, IC32y, calldataload(add(pubSignals, 992)))
                
                g1_mulAccC(_pVk, IC33x, IC33y, calldataload(add(pubSignals, 1024)))
                
                g1_mulAccC(_pVk, IC34x, IC34y, calldataload(add(pubSignals, 1056)))
                
                g1_mulAccC(_pVk, IC35x, IC35y, calldataload(add(pubSignals, 1088)))
                
                g1_mulAccC(_pVk, IC36x, IC36y, calldataload(add(pubSignals, 1120)))
                
                g1_mulAccC(_pVk, IC37x, IC37y, calldataload(add(pubSignals, 1152)))
                
                g1_mulAccC(_pVk, IC38x, IC38y, calldataload(add(pubSignals, 1184)))
                
                g1_mulAccC(_pVk, IC39x, IC39y, calldataload(add(pubSignals, 1216)))
                
                g1_mulAccC(_pVk, IC40x, IC40y, calldataload(add(pubSignals, 1248)))
                
                g1_mulAccC(_pVk, IC41x, IC41y, calldataload(add(pubSignals, 1280)))
                
                g1_mulAccC(_pVk, IC42x, IC42y, calldataload(add(pubSignals, 1312)))
                
                g1_mulAccC(_pVk, IC43x, IC43y, calldataload(add(pubSignals, 1344)))
                
                g1_mulAccC(_pVk, IC44x, IC44y, calldataload(add(pubSignals, 1376)))
                
                g1_mulAccC(_pVk, IC45x, IC45y, calldataload(add(pubSignals, 1408)))
                
                g1_mulAccC(_pVk, IC46x, IC46y, calldataload(add(pubSignals, 1440)))
                
                g1_mulAccC(_pVk, IC47x, IC47y, calldataload(add(pubSignals, 1472)))
                
                g1_mulAccC(_pVk, IC48x, IC48y, calldataload(add(pubSignals, 1504)))
                
                g1_mulAccC(_pVk, IC49x, IC49y, calldataload(add(pubSignals, 1536)))
                
                g1_mulAccC(_pVk, IC50x, IC50y, calldataload(add(pubSignals, 1568)))
                
                g1_mulAccC(_pVk, IC51x, IC51y, calldataload(add(pubSignals, 1600)))
                
                g1_mulAccC(_pVk, IC52x, IC52y, calldataload(add(pubSignals, 1632)))
                
                g1_mulAccC(_pVk, IC53x, IC53y, calldataload(add(pubSignals, 1664)))
                
                g1_mulAccC(_pVk, IC54x, IC54y, calldataload(add(pubSignals, 1696)))
                
                g1_mulAccC(_pVk, IC55x, IC55y, calldataload(add(pubSignals, 1728)))
                
                g1_mulAccC(_pVk, IC56x, IC56y, calldataload(add(pubSignals, 1760)))
                
                g1_mulAccC(_pVk, IC57x, IC57y, calldataload(add(pubSignals, 1792)))
                
                g1_mulAccC(_pVk, IC58x, IC58y, calldataload(add(pubSignals, 1824)))
                
                g1_mulAccC(_pVk, IC59x, IC59y, calldataload(add(pubSignals, 1856)))
                
                g1_mulAccC(_pVk, IC60x, IC60y, calldataload(add(pubSignals, 1888)))
                
                g1_mulAccC(_pVk, IC61x, IC61y, calldataload(add(pubSignals, 1920)))
                
                g1_mulAccC(_pVk, IC62x, IC62y, calldataload(add(pubSignals, 1952)))
                
                g1_mulAccC(_pVk, IC63x, IC63y, calldataload(add(pubSignals, 1984)))
                
                g1_mulAccC(_pVk, IC64x, IC64y, calldataload(add(pubSignals, 2016)))
                
                g1_mulAccC(_pVk, IC65x, IC65y, calldataload(add(pubSignals, 2048)))
                
                g1_mulAccC(_pVk, IC66x, IC66y, calldataload(add(pubSignals, 2080)))
                
                g1_mulAccC(_pVk, IC67x, IC67y, calldataload(add(pubSignals, 2112)))
                
                g1_mulAccC(_pVk, IC68x, IC68y, calldataload(add(pubSignals, 2144)))
                
                g1_mulAccC(_pVk, IC69x, IC69y, calldataload(add(pubSignals, 2176)))
                
                g1_mulAccC(_pVk, IC70x, IC70y, calldataload(add(pubSignals, 2208)))
                
                g1_mulAccC(_pVk, IC71x, IC71y, calldataload(add(pubSignals, 2240)))
                
                g1_mulAccC(_pVk, IC72x, IC72y, calldataload(add(pubSignals, 2272)))
                
                g1_mulAccC(_pVk, IC73x, IC73y, calldataload(add(pubSignals, 2304)))
                
                g1_mulAccC(_pVk, IC74x, IC74y, calldataload(add(pubSignals, 2336)))
                
                g1_mulAccC(_pVk, IC75x, IC75y, calldataload(add(pubSignals, 2368)))
                
                g1_mulAccC(_pVk, IC76x, IC76y, calldataload(add(pubSignals, 2400)))
                
                g1_mulAccC(_pVk, IC77x, IC77y, calldataload(add(pubSignals, 2432)))
                
                g1_mulAccC(_pVk, IC78x, IC78y, calldataload(add(pubSignals, 2464)))
                
                g1_mulAccC(_pVk, IC79x, IC79y, calldataload(add(pubSignals, 2496)))
                
                g1_mulAccC(_pVk, IC80x, IC80y, calldataload(add(pubSignals, 2528)))
                
                g1_mulAccC(_pVk, IC81x, IC81y, calldataload(add(pubSignals, 2560)))
                
                g1_mulAccC(_pVk, IC82x, IC82y, calldataload(add(pubSignals, 2592)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            
            checkField(calldataload(add(_pubSignals, 512)))
            
            checkField(calldataload(add(_pubSignals, 544)))
            
            checkField(calldataload(add(_pubSignals, 576)))
            
            checkField(calldataload(add(_pubSignals, 608)))
            
            checkField(calldataload(add(_pubSignals, 640)))
            
            checkField(calldataload(add(_pubSignals, 672)))
            
            checkField(calldataload(add(_pubSignals, 704)))
            
            checkField(calldataload(add(_pubSignals, 736)))
            
            checkField(calldataload(add(_pubSignals, 768)))
            
            checkField(calldataload(add(_pubSignals, 800)))
            
            checkField(calldataload(add(_pubSignals, 832)))
            
            checkField(calldataload(add(_pubSignals, 864)))
            
            checkField(calldataload(add(_pubSignals, 896)))
            
            checkField(calldataload(add(_pubSignals, 928)))
            
            checkField(calldataload(add(_pubSignals, 960)))
            
            checkField(calldataload(add(_pubSignals, 992)))
            
            checkField(calldataload(add(_pubSignals, 1024)))
            
            checkField(calldataload(add(_pubSignals, 1056)))
            
            checkField(calldataload(add(_pubSignals, 1088)))
            
            checkField(calldataload(add(_pubSignals, 1120)))
            
            checkField(calldataload(add(_pubSignals, 1152)))
            
            checkField(calldataload(add(_pubSignals, 1184)))
            
            checkField(calldataload(add(_pubSignals, 1216)))
            
            checkField(calldataload(add(_pubSignals, 1248)))
            
            checkField(calldataload(add(_pubSignals, 1280)))
            
            checkField(calldataload(add(_pubSignals, 1312)))
            
            checkField(calldataload(add(_pubSignals, 1344)))
            
            checkField(calldataload(add(_pubSignals, 1376)))
            
            checkField(calldataload(add(_pubSignals, 1408)))
            
            checkField(calldataload(add(_pubSignals, 1440)))
            
            checkField(calldataload(add(_pubSignals, 1472)))
            
            checkField(calldataload(add(_pubSignals, 1504)))
            
            checkField(calldataload(add(_pubSignals, 1536)))
            
            checkField(calldataload(add(_pubSignals, 1568)))
            
            checkField(calldataload(add(_pubSignals, 1600)))
            
            checkField(calldataload(add(_pubSignals, 1632)))
            
            checkField(calldataload(add(_pubSignals, 1664)))
            
            checkField(calldataload(add(_pubSignals, 1696)))
            
            checkField(calldataload(add(_pubSignals, 1728)))
            
            checkField(calldataload(add(_pubSignals, 1760)))
            
            checkField(calldataload(add(_pubSignals, 1792)))
            
            checkField(calldataload(add(_pubSignals, 1824)))
            
            checkField(calldataload(add(_pubSignals, 1856)))
            
            checkField(calldataload(add(_pubSignals, 1888)))
            
            checkField(calldataload(add(_pubSignals, 1920)))
            
            checkField(calldataload(add(_pubSignals, 1952)))
            
            checkField(calldataload(add(_pubSignals, 1984)))
            
            checkField(calldataload(add(_pubSignals, 2016)))
            
            checkField(calldataload(add(_pubSignals, 2048)))
            
            checkField(calldataload(add(_pubSignals, 2080)))
            
            checkField(calldataload(add(_pubSignals, 2112)))
            
            checkField(calldataload(add(_pubSignals, 2144)))
            
            checkField(calldataload(add(_pubSignals, 2176)))
            
            checkField(calldataload(add(_pubSignals, 2208)))
            
            checkField(calldataload(add(_pubSignals, 2240)))
            
            checkField(calldataload(add(_pubSignals, 2272)))
            
            checkField(calldataload(add(_pubSignals, 2304)))
            
            checkField(calldataload(add(_pubSignals, 2336)))
            
            checkField(calldataload(add(_pubSignals, 2368)))
            
            checkField(calldataload(add(_pubSignals, 2400)))
            
            checkField(calldataload(add(_pubSignals, 2432)))
            
            checkField(calldataload(add(_pubSignals, 2464)))
            
            checkField(calldataload(add(_pubSignals, 2496)))
            
            checkField(calldataload(add(_pubSignals, 2528)))
            
            checkField(calldataload(add(_pubSignals, 2560)))
            
            checkField(calldataload(add(_pubSignals, 2592)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
