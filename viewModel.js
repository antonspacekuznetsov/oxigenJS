viewModel = {
    text: ox.updateAble(1),
    n: ox.updateAble(2),
    f:1,
    gg:ox.updateAble(false),
    fn: function(t){alert(t);},
    ar:[{name:"Anton", surname:"Kuznetsov"}, {name:'Lena'}],
    ar2:[{name:"Mike", surname:"Kuznetsov"}, {name:'Vera'}],
    removePerson:function(){alert()}
}
viewModel.text.watch(function(v){alert(viewModel.text()); viewModel.text.unwatch();});
setTimeout(function(){viewModel.gg(true)}, 2000);
ox.start(viewModel)