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
                            if(ex.message === 'BCI')
                            {
                                continue;
                            }
                            else{
                                throw ex;
                            }
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
            },

            findElement: function(el){
                for(let i = 0; i < elements.length; i++){
                    if(el === elements[i].element){
                        return elements[i];
                    }
                }
            },

            findElementDESC: function(el){
                for(let i = elements.length - 1; i > -1; i--){
                    if(el === elements[i].element){
                        return elements[i];
                    }
                }
            },
            
            isExistElement: function(el){
                for(let i = 0;  i < elements.length; i++ ){
                    if(elements[i].element === el){
                        return true;
                    }
                }
                return false;
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

                let arr = [{el:el, count:virtualEl.childElementCount}];
                let fn =function(oneEl) {
                    let newElement = oneEl.cloneNode(true);
                    helper.scanBinder(newElement, localContext); 

                        if(newElement.childElementCount > 0){
                            let cloneEl = newElement.cloneNode(true);
                            cloneEl.innerHTML = "";
                            arr.push({el:cloneEl, count:newElement.childElementCount});
                            return;
                        }

                        arr[arr.length - 1].el.append(newElement);

                        while(true){
                            if(--arr[arr.length - 1].count === 0 && arr.length !== 1 ){
                                let curEl = arr.pop();
                                arr[arr.length - 1].el.append(curEl.el);
                            }
                            else{
                                break;
                            }
                        }  
                                                
                };

                for(let i = 0; i < value.length; i++){
                    localContext.$index = i;
                    helper.scanHTML(virtualEl, fn, true);
                }
                throw new Error('BCI');
            }},
            {binder:'o-if', fn:function(el, value){
                let _el = helper.findElementDESC(el);
                if(!value){
                    _el.saveInnerHTML = _el.element.innerHTML;
                    el.innerHTML = "";
                }
                else{

                    el.innerHTML = _el.saveInnerHTML;
                    helper.scanHTML(el, function(el){
                        if(!helper.isExistElement(el)){
                            helper.scanBinder(el);
                        }
                    });
                    _el.saveInnerHTML = null;
                }
            }}
    
        ];

        let extendedMethods = {
            watch: function(fn){
                if(typeof fn !== 'function'){
                    throw new Error('Fn parameter must be an function!');  
                }
                for(let i = 0; i < listUpdaters.length; i++){
                    if(listUpdaters[i].fnLink === this){
                        listUpdaters[i].callback = fn;
                        break;
                    }
                }
            },
            unwatch: function(){
                for(let i = 0; i < listUpdaters.length; i++){
                    if(listUpdaters[i].fnLink === this){
                        listUpdaters[i].callback = null;
                        break;
                    }
                }
            }
        }

        let ox = {
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
                    isInitMode = false;

            },

            removeAllWatch: function(){
                for(let i = 0; i < listUpdaters.length; i++){
                    listUpdaters[i].callback = null;
                }
            },

            updateAble: function(value = null){
                let index;
                let fn = function(value = null){ 
                    if(value === null){
                       if (isInitMode) {indexes.push(index);}
                        return listUpdaters[index].value;
                    }
        
                    listUpdaters[index].value = value;

                    if(listUpdaters[index].callback !== null){
                        listUpdaters[index].callback(value);
                    }

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
                index = listUpdaters.push({value: value, fnLink: fn, callback:null}) - 1;  
                Object.setPrototypeOf(fn, extendedMethods);
                return fn;
            },

            isUpdatAble: function(fn){
                if(typeof fn !== 'function'){
                    throw new Error('Fn parameter must be an function!');  
                }
                for(let i = 0; i < listUpdaters.length; i++){
                    if(listUpdaters[i].fnLink === fn){
                        return true;
                    }
                }
                return false;
            }
                       
        }
        return ox;
    }
)()

