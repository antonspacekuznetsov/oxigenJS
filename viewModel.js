viewModel = {
    text: ox.updateAble(1),
    n: ox.updateAble(2),
    f:1,
    fn: function(t){alert(t);},
    ar:[{name:"Anton", surname:"Kuznetsov"}, {name:'Lena'}],
    ar2:[{name:"Mike", surname:"Kuznetsov"}, {name:'Vera'}],
    removePerson:function(){alert()}
}
setTimeout(function(){viewModel.text('gfdgfdgdf')}, 2000);
ox.start(viewModel)