var ox = (
    function(){
        let listUpdaters = [];
        let virtualViewModel = {};
        let elements = [];
        let indexes = [];
        let isInitMode = true;
        let helper = {
            scanHTML: function(element, callback, inOrder = false){
                if(typeof callback !== 'function'){
                    throw new Error('Fn parameter must be an function!');    
                }
                let arr = [{el:element, i:0}];

                while(arr.length)
                {
                    let item = arr.pop();

                    for(let i = item.i; i < item.el.childNodes.length; i++)
                    {
                        let node = item.el.childNodes[i];
                        let element = null;

                        if(this.isStartComment(node))
                        {
                            let text = this.getCommentText(node);
                            element = node;
                            element.attributes = [{name:text[2], value:text[3]}];
                        }

                        if(!this.isElement(node) && !this.isStartComment(node))
                        {
                            continue;
                        }
                        else
                        {
                            element = node;
                        }

                        try
                        {
                            callback(element);
                        }
                        catch(ex)
                        {
                            if(ex.message === 'BCI')
                            {
                                continue;
                            }
                            else{
                                throw ex;
                            }
                        }
                        if(element.childElementCount > 0){
                            if(inOrder && item.el.childElementCount - (i+1) !== 0){
                                arr.push({el:item.el, i:i+1});
                                arr.push({el:element, i:0});
                                break;
                            }
                            arr.push({el:element, i:0});
                        }
                    }
                }
            },
            
            checkComment: function(comment)
            {
                if(!this.isStartComment(comment))
                {
                    console.log(comment);
                    throw Error('This comment is not start comment oxigen js.');
                }

                let commnetCount = 0;

                while(comment){

                    if(comment === null)
                    {
                        break;
                    }
                    if(this.isStartComment(comment))
                    {
                        commnetCount++;
                    }

                    if(this.isCloseComment(comment))
                    {
                        commnetCount--;
                    }

                    if(commnetCount === 0)
                    {
                        return comment;
                    }

                    comment = comment.nextSibling;
                }

                if(commnetCount !== 0)
                {
                    throw Error('One or couple comments have not close or start comment!');
                }

            },

            getCommentText: function(node)
            {
                let str = node.nodeValue.replace(/\s/g, '');
                str = str.toLowerCase();
                return str.match(/(^ox)(o-if|for)\:(\w+)$/i);
            },

            isElement: function(node)
            {
                if(node.children !== undefined && node.childElementCount !== undefined)
                {
                    return true;
                }
                return false;
            },

            isStartComment: function(node)
            {
                if(node.children === undefined && node.childElementCount === undefined)
                {
                    if(node.nodeValue !== undefined && node.nodeName === '#comment')
                    {
                        let str = node.nodeValue.replace(/\s/g, '');
                        str = str.toLowerCase();
                        if(/(^ox)(o-if|for)\:\w+$/i.test(str)){
                            return true;
                        }
                    }
                }
                return false;
            },

            isCloseComment: function(node)
            {
                if(node.children === undefined && node.childElementCount === undefined)
                {
                    if(node.nodeValue !== undefined && node.nodeName === '#comment')
                    {
                        let str = node.nodeValue.replace(/\s/g, '');
                        str = str.toLowerCase();
                        if(/^\/ox$/i.test(str)){
                            return true;
                        }
                    }
                }
                return false;
            },

            scanBinderMX: function(el){
                let item = el;
                for (let j = 0; j < item.attributes.length; j++){
                    for (let l = 0; l < listBindings.length; l++){
                        if(item.attributes[j].name === listBindings[l].binder){
                            let result;
                            with(this){result = listBindings[l].calc ? eval("(" + item.attributes[j].value + ")") : item.attributes[j].value};
                            if(indexes.length > 0)
                            {
                                elements.push({element:item, binding:item.attributes[j].name, listIndexes:indexes, expression:item.attributes[j].value, context:this, index:this.$index});  
                                indexes = [];   
                            }
                            listBindings[l].fn.call(this, item, result);                           
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
            findElementIndex: function(el){
                for(let i = 0; i < elements.length; i++){
                    if(el === elements[i].element){
                        return i;
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
            },
            removeElement:function(el){
                let callback = function(el){
                    if(helper.isExistElement(el)){
                        let index = helper.findElementIndex(el);
                        elements.splice(index, 1);
                    }
                }
                helper.scanHTML(el, callback);

            }

        };
        let listBindings = [
            {binder:'o-text', calc:true, fn:function(el, value){ el.innerText=value;}},
            {binder:'o-html', calc:true, fn:function(el,value){el.innerHTML=value;}},
            {binder:'o-click', calc:true, fn:function(el, value){
                if(typeof value !== 'function'){
                    throw new Error('o-click value must be an function!');  
                }
                let index = this.$index;
                let that = this;
                let callback = function(){   
                    that.$index = index;            
                    value.call(that);    
                }
                 el.addEventListener("click", callback);
            }},
            {binder:'o-value', calc:false, fn:function(el, value, index = null){
                if(index !== null){
                    return;
                }
                let that = this;
                el.value = that[value];
                let callback = function(){   
                    that[value] = el.value;
                }
                 el.addEventListener("input", callback);
            }},
            {binder:'o-for', calc:true, fn:function(el, value, index = null){
                if(!Array.isArray(value)){
                    throw new Error('Value must be an array!');
                }

                let localContext = {$base:virtualViewModel, $index:0, get $data(){return value[this.$index] }}
                let virtualEl;
                
                if(index === null){
                    virtualEl = el.cloneNode(true);
                    elements[elements.length - 1].nativeElement = virtualEl;
                }
                else{
                    helper.removeElement(el);
                    virtualEl = elements[index].nativeElement;
                }

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

                let callback = function(oneEl) {
                    
                    helper.scanBinderMX.call(localContext, oneEl); 
                    let newElement = oneEl.cloneNode(true);
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
                    helper.scanHTML(virtualEl, callback, true);
                }
                if(isInitMode){
                    throw new Error('BCI');
                }
            }},
            {binder:'o-attr', calc:true, fn:function(el,value){
                if(typeof value !== 'object'){
                    throw new Error('o-attr value must be an object!');   
                }

                let keys = Object.keys(value);

                for (let i = 0; i < keys.length; i++)
                {
                    el[keys[i]] = value[keys[i]];
                }

            }},
            {binder:'o-style', calc:true, fn:function(el,value){
                if(typeof value !== 'object'){
                    throw new Error('o-attr value must be an object!');   
                }

                let keys = Object.keys(value);

                for (let i = 0; i < keys.length; i++)
                {
                    el.style[keys[i]] = value[keys[i]];
                }

            }},
            {binder:'o-if', calc:true, fn:function(el, value){
                if(typeof value !== 'boolean'){
                    throw new Error('o-if The value must be boolean');   
                }
                
                let _el = helper.findElementDESC(el);
                let end = helper.isElement(el) ? null : helper.checkComment(el);
                let localEl = end === null ? el.childNodes[0] : el;

                if(_el === undefined){
                    if(!value)
                    {
                        while(localEl.nextSibling)
                        {
                            if(localEl.nextSibling === end)
                            {
                                break;
                            }
                            localEl.nextSibling.remove();
                        }
                    }
                    return;
                }
                
                if(!value){
                    if(el.childElementCount === 0)
                    {
                        return;
                    }

                    if(_el.innerElements === undefined)
                    {
                        _el.innerElements = {listElements:[], isInit:false};
                    }
                    
                    while(localEl.nextSibling)
                    {
                        if(localEl.nextSibling === end)
                        {
                            break;
                        }
                        _el.innerElements.listElements.push(localEl.nextSibling);
                        localEl.nextSibling.remove();
                    }

                }
                else
                {
                    if(_el.innerElements === undefined)
                    {
                        return;
                    }
                    
                    let len = _el.innerElements.listElements.length;
                    let _virtualElement = {childNodes:[]};

                    for(let i = 0; i < len; i++)
                    {
                        let node = _el.innerElements.listElements.shift();
                        localEl.parentElement.insertBefore(node, end);
                        _virtualElement.childNodes.push(node);
                    }
                    
                    if(!_el.innerElements.isInit)
                    {
                        helper.scanHTML(end === null ? el : _virtualElement, function(el) {
                            helper.scanBinderMX.call(virtualViewModel, el);
                            throw new Error('BCI');
                        });
                        _el.innerElements.isInit = true;
                    }
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
                                    },
                                    set: function(value) {
                                        viewModel[keys[i]](value);
                                    }
                                  });
                            }
                        }
                    }
                    helper.scanHTML(root, function(element) 
                    {
                        helper.scanBinderMX.call(virtualViewModel, element);
                    });
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
                        indexes.push(index);
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
                                            let result;
                                            with(elements[i].context){result = eval("(" + elements[i].expression + ")")};
                                            listBindings[b].fn(elements[i].element, result, i);  
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

