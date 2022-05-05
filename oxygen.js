var ox = (
    function(){
        let listUpdaters = [];
        let virtualViewModel = {};
        let elements = [];
        let indexes = [];
        let isInitMode = true;
        let helper = {
            scanHTML: function(element, fn, inOrder = false){
                if(typeof fn !== 'function'){
                    throw new Error('Fn parameter must be an function!');    
                }
                let arr = [{el:element, i:0}];
                while(arr.length){
                    let item = arr.pop();
                    for(let i = item.i; i < item.el.childElementCount; i++){
                        try{
                            fn(item.el.children[i]);
                        }
                        catch(ex){
                            continue;
                        }
                        if(item.el.children[i].childElementCount > 0){
                            if(inOrder && item.el.childElementCount - (i+1) !== 0){
                                arr.push({el:item.el, i:i+1});
                                arr.push({el:item.el.children[i], i:0});
                                break;
                            }
                            arr.push({el:item.el.children[i], i:0});
                        }
                    }
                }
            },
            scanBinder: function(el, cntx = context){
                let item = el;
                for (let j = 0; j < item.attributes.length; j++){
                    for (let l = 0; l < listBindings.length; l++){
                        if(item.attributes[j].name === listBindings[l].binder){
                            with(cntx){result = eval("(" + item.attributes[j].value + ")");};
                            elements.push({element:item, binding:item.attributes[j].name, listIndexes:indexes, expression:item.attributes[j].value, context:cntx, index:cntx.$index});  
                            indexes = [];     
                            listBindings[l].fn(item, result);                           
                        }
                    }
                }
            }
        };
        let listBindings = [
            {binder:'o-text', fn:function(el, value){ el.innerText=value;}},
            {binder:'o-click', fn:function(el, value){ el.addEventListener("click", value);}},
            {binder:'o-for', fn:function(el, value){
                if(!Array.isArray(value)){
                    throw new Error('Value must be an array!');
                }
                let localContext = {$base:virtualViewModel, $index:0, get $data(){return value[this.$index]}}
                let virtualEl = el.cloneNode(true);
                el.innerHTML = "";
                for(let i = 0 ; i < value.length; i++){
                    if(typeof value[i] === 'object'){
                        let keys = Object.keys(value[i]);
                        for (let j = 0 ; j < keys.length; j++){
                            if(localContext[keys[j]] === undefined){
                                Object.defineProperty(localContext, keys[j].toString(), {
                                    get: function() {
                                    return localContext.$data[keys[j]];
                                    }
                                });
                            }
                        }
                    }
                }

                for(let i = 0; i < value.length; i++){
                    localContext.$index = i;
                    helper.scanHTML(virtualEl, function(oneEl) {
                        let newElement = oneEl.cloneNode(true);
                        helper.scanBinder(newElement, localContext); 
                        el.append(elements[elements.length - 1].element);
                    });
                }
                throw new Error('Break current iteration.');
            }}
    
        ];
        return {
            start: function(viewModel, element = 'body'){
                    let keys = Object.keys(viewModel);
                    for (let i = 0; i < keys.length; i++){
                        virtualViewModel[keys[i]] = viewModel[keys[i]];
                    }
                    virtualViewModel.$index = null;

                    let root = document.getElementsByTagName(element)[0];
                    
                    for (let i = 0; i < keys.length; i++)
                    {
                        for (let j = 0; j < listUpdaters.length; j++)
                        {
                            if(listUpdaters[j].fnLink === viewModel[keys[i]]){
                                Object.defineProperty(virtualViewModel, keys[i].toString(), {
                                    get: function() {
                                      return viewModel[keys[i]]()
                                    }
                                  });
                            }
                        }
                    }
                    helper.scanHTML(root, function(root) {helper.scanBinder(root, virtualViewModel)});
                    //this.scanHTML(root[0]);
                    isInitMode = false;

            },

            updateAble: function(value = null){
                let index;
                let fn = function(value = null){ 
                    if(value === null){
                       if (isInitMode) {indexes.push(index);}
                        return listUpdaters[index].value;
                    }
        
                    listUpdaters[index].value = value;

                    if(!isInitMode){
                        for(let i = 0; i < elements.length; i++){
                            for (let j = 0; j < elements[i].listIndexes.length; j++){
                                if(elements[i].listIndexes[j] === index){
                                    for(let b = 0; b < listBindings.length; b++){
                                        if(listBindings[b].binder === elements[i].binding){
                                            if(elements[i].index !== null){
                                                elements[i].context.$index = elements[i].index;
                                            }
                                            with(elements[i].context){result = eval("(" + elements[i].expression + ")")};
                                            listBindings[b].fn(elements[i].element, result);  
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }  
                index = listUpdaters.push({value: value, fnLink: fn}) - 1;  
                return fn;
            }
                       
        }
    }
)()

