viewModel = {
    text: ox.updateAble(1),
    n: ox.updateAble(2),
    f:1,
    fn: function(t){alert(t);},
    ar:[{name:"Anton", surname:"Kuznetsov"}, {name:'Lena'}],
    removePerson:function(){alert()}
}
setTimeout(function(){viewModel.text('gfdgfdgdf')}, 2000);
ox.start(viewModel)