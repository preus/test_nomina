/*
 * 0.-Variables
 * 1.-Modelos
 * 2.-Colecciones
 * 3.-Vistas
 * 4.-Rutas
 * 5.-Load
 * 6.-Funciones Sockets
 * 7.-Funciones
 * 8.-Templates
 * 9.-Pruebas
 */

 /* ----------------------------------------- 0.-Variables ----------------------------------------- */
var app = {},
	tempo = 0;

/* ----------------------------------------- 1.-Modelos ----------------------------------------- */
app.MoArticulo = Backbone.Model.extend({
	defaults:{
		_id:'',
		CodigoBarras:'',
		Articulo:'',
		Tipo: { 
				id:0, 
				Descripcion:''
		},
		Costo:0,
		Importe:0,
		Cantidad: 0,
		Total: 0,
		EspImporte: 0
	}
});

app.MoRetencion = Backbone.Model.extend({
	defaults:{
		articulos:{}
	}
});
/* ----------------------------------------- 2.-Colecciones ----------------------------------------- */
var CoArticulosList = Backbone.Collection.extend({
	model: app.MoArticulo
});

var CoRetencionList = Backbone.Collection.extend({
	model: app.MoRetencion
});

app.CoArticulos = new CoArticulosList();
app.CoRetencion = new CoRetencionList();

app.CoArticulos.on('add', function(model){
	var total = roundCN(parseFloat(model.get('Cantidad')) * (parseFloat(model.get('Costo')) + model.get('EspImporte')), 2);
	model.set({Total:total});

	var spanTotal = $('#total_venta .total'),
		sumTotal = roundCN(spanTotal.text(), 2) + total;

		spanTotal.text(roundCN(sumTotal, 2));
})
/* ----------------------------------------- 3.-Vistas ----------------------------------------- */
app.vwVetanArticulos = Backbone.View.extend({
	el: '#venta_articulos',
	initialize: function (){
		this.template = app.templates.vArticulo;
		this.tabla = this.$el.find('#gvArticulosVM');
		this.$spanTotal = this.$el.find('#total_venta .total');
		this.$spanTCambio = this.$el.find('#total_venta .tipo-cambio');

		this.listenTo(app.CoArticulos, 'add', this.CoArticulos_Add);
		this.listenTo(app.CoArticulos, 'change:EspImporte', this.CoArticulos_CImporte);
		this.listenTo(app.CoArticulos, 'remove', this.CoArticulos_Remove);
		this.listenTo(app.CoArticulos, 'reset', this.CoArticulos_Reset);
	},
	CoArticulos_Add: function(modelo) {
		var data = {},
			data = modelo.attributes;
		data.cid = modelo.cid;
		var	row = this.template(data);
		this.tabla.children('tbody').prepend(row);
	},
	CoArticulos_CImporte:function(modelo) {
		var row = this.tabla.find('#' + modelo.cid + ' td');

		row[5].innerHTML = modelo.get('EspImporte');
		row[6].innerHTML = modelo.get('Total');
	},
	CoArticulos_Remove: function(modelo){
		this.$el.find('#'+modelo.cid).remove();

		var spanTotal = $('#total_venta .total');
		if(app.CoArticulos.length == 0)
			spanTotal.text(0);
		else {
			sumTotal = roundCN(spanTotal.text(), 2) - modelo.get('Total');	
			spanTotal.text(roundCN(sumTotal, 2));
		}
	},
	CoArticulos_Reset: function(){
		this.tabla.children('tbody').html('');
		this.$spanTotal.text('0');
	}
});
app.vwBusquedaArticulos = Backbone.View.extend({
	tagName: 'div',
	className: 'panel-modal isHidden index-primary',
	events:{
		'click a'						: 'a_Click',
		'click #gvBusquedaAR tbody td'	: 'td_click',
		'keyup #txtBusquedaAR'			: 'txtBusquedaAR_Keyup'
	},
	initialize:function(){
		this.template = app.templates.bBase;
		this.$el.append(this.template()).attr('id', 'busqueda_articulos');
		$('body').append(this.$el);

		this.$txtBusquedaAR = this.$el.find('#txtBusquedaAR');
		this.$gvBusquedaAR = this.$el.find('#gvBusquedaAR');
		this.timeSearch = null;
		this.busqueda = '';
		this.isShow = false;
		app.conf.inSearch = false;

		this.$txtBusquedaAR.keyfilter(/[A-Za-z0-9]/);
		this.$paginacion = this.$el.find('.pagination');

		//this.$txtBusquedaAR.focus();
		//app.socket.emit(app.ns.agSearchDatos, {tipo:app.conf.bTipo, current:1});
	},
	a_Click: function(e) {
		e.preventDefault();
		var current = $(e.currentTarget);

		var liCurrent = this.$paginacion.find('li.current');
		if(liCurrent.children('a').data('num') == current.data('num') || (current.text() == '»' && current.parents('li').prev().children('a').text() == liCurrent.children('a').text()))
			return;

		liCurrent.removeClass('current')
		current.parents('li').addClass('current');
		app.ut.show();
		app.socket.emit(app.ns.agSearchDatos, {tipo:app.conf.bTipo, search:this.$txtBusquedaAR.val(), current:current.data('num'), by:2});
	},
	td_click: function(e){
		var data = $(e.currentTarget).parents('tr').data('info');
		if(data) {
			this.close();
			switch(app.conf.bTipo) {
				case 1:
					app.CoArticulos.add(data);
					app.keytrap.pvMain();
					break;
				case 2:
					var nombre = $(e.currentTarget).parents('tr').children('td')[1].innerHTML;
					$('#txtClienteCV').data('info', data).val(nombre).parents('#pnlClienteCV').removeClass('isHidden');
					app.keytrap.pvCierre();
					break;
			}
		}
	},
	txtBusquedaAR_Keyup: function(e){
		//console.log(e.keyCode);
		if(this.isShow) {
			this.isShow = false;
			return;
		}

		var busqueda = this.busqueda;
		if( (e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 96 && e.keyCode <= 105) || (this.busqueda != this.$txtBusquedaAR.val()) ) {
			clearTimeout(this.timeSearch);
			app.conf.inSearch = true;
			busqueda = this.busqueda = this.$txtBusquedaAR.val();
	
			this.timeSearch = setTimeout(fSeacrh, 1000);
		}
		else if(app.conf.inSearch) {
			clearTimeout(this.timeSearch);	
			busqueda = this.busqueda = this.$txtBusquedaAR.val();
			this.timeSearch = setTimeout(fSeacrh, 1000);
		}

		function fSeacrh() {
			app.ut.show();
			app.socket.emit(app.ns.agSearchDatos, {tipo:app.conf.bTipo, search:busqueda, current:1, by:1});
			app.conf.inSearch = false;
			console.log('busqueda: '+busqueda);
		}
	},
	/*------------------------------- Base -------------------------------*/
	close: function(){
		this.$el.addClass('isHidden');
		this.$txtBusquedaAR.val('');
	},
	show: function(p_bTipo){
		app.conf.bTipo = p_bTipo || 1;
		this.$el.removeClass('isHidden');		
		this.isShow = true;

		switch(app.conf.bTipo) {
			case 1:
				this.$gvBusquedaAR.children('thead').html(app.templates.bhArticulos());
				break;
			case 2:
				this.$gvBusquedaAR.children('thead').html(app.templates.bhClientes());
				break;
		}

		app.socket.emit(app.ns.agSearchDatos, {tipo:app.conf.bTipo, current:1});
		this.$txtBusquedaAR.val('').focus();
	}
});
app.vwCierreVenta = Backbone.View.extend({
	tagName: 'div',
	className: 'panel-modal isHidden',
	events: {
		'click #btnCerrarCV'				: 'btnCerrarCV_Click',		
		'click #swtFactura input:checked' 	: 'swtFactura_Click',
		'click #swtMoneda input:checked' 	: 'swtMoneda_Click',
		'keyup #txtRecibidoCV'				: 'txtRecibidoCV_Keyup'
	},
	initialize: function() {
		this.template = app.templates.cCierre;
		this.$el.append(this.template());
		$('body').append(this.$el);

		this.$txtRecibidoCV = this.$el.find('#txtRecibidoCV');
		this.$txtTotalCV = this.$el.find('#txtTotalCV');
		this.$txtCambioCV = this.$el.find('#txtCambioCV');
		this.$swtFactura = this.$el.find('#swtFactura');
		this.$swtMoneda = this.$el.find('#swtMoneda');
		this.$pnlClienteCV = this.$el.find('#pnlClienteCV');
		this.$txtClienteCV = this.$el.find('#txtClienteCV');
		this.$btnCerrarCV = this.$el.find('#btnCerrarCV');

		this.factura = false;
		this.total = 0;
		this.totIVA = 0;
		this.moneda = 1;
		this.isShow = false;

		this.$txtRecibidoCV.focus().keyfilter(/^[0-9\.]+$/);
	},
	btnCerrarCV_Click: function(){
		this.save();
	},
	swtFactura_Click: function(e){
		this.factura = $(e.currentTarget).data('val');

		var total = 0,
			iva = this.moneda == 2 ? this.totIVA / 13 : this.totIVA;
		if(this.factura)
			total = roundCN(getDecimals(this.$txtTotalCV.val(), 2) + iva, 2);
		else
			total = roundCN(getDecimals(this.$txtTotalCV.val(), 2) - iva, 2);

		this.$txtTotalCV.val(total);
		this.$txtCambioCV.val(this.getTotal());
	},
	swtMoneda_Click: function(e){
		this.moneda = $(e.currentTarget).data('val');

		var iva = this.factura ? this.totIVA : 0,
			dolar = app.conf.dolar;
		// 1.- Pesos - 2.- Dolar
		if(this.moneda == 1)
			this.$txtTotalCV.val(roundCN(this.total + iva, 2));
		else
			this.$txtTotalCV.val(roundCN(getDecimals((this.total / dolar) + (iva / 13), 2), 2));

		this.$txtCambioCV.val(this.getTotal());
	},
	txtRecibidoCV_Keyup: function(){
		this.$txtCambioCV.val(this.getTotal());
	},
	/*------------------------------- Base -------------------------------*/
	close: function(){
		this.totIVA = 0;
		this.$txtRecibidoCV.val(0);
		this.$txtTotalCV.val(0);
		this.$txtCambioCV.val(0);
		this.$pnlClienteCV.addClass('isHidden');
		this.$txtClienteCV.val('').removeData();

		this.$swtFactura.find('#rblNoCV').click();
		this.$swtMoneda.find('#rblPesosCV').click();

		this.$el.addClass('isHidden');
		$('#txtCodigoBarrasPV').focus();
	},
	getTotal: function(p_moneda) {
		var moneda = p_moneda || this.moneda,
			tot = this.$txtTotalCV.val(),
			cam = this.$txtCambioCV.val(),
			rec = this.$txtRecibidoCV.val(),
			res = roundCN((rec - tot) * (moneda == 1 ? 1 : app.conf.dolar), 2);

		return res < 0 ? 0 : res;
	},
	save: function() {
		var recibido = roundCN(this.$txtRecibidoCV.val(), 2),
			total = roundCN(this.$txtTotalCV.val(), 2);

		if(recibido < total && this.$pnlClienteCV.hasClass('isHidden')) {
			app.ut.message('El dinero recibido no puede ser menor al total'); 
			return;
		}
					
		var clienteInfo = this.$txtClienteCV.data('info'),
			cliente = clienteInfo ? {
				_id			: clienteInfo._id,
				Nombre 		: clienteInfo.Nombre,
				APaterno	: clienteInfo.APaterno,
				AMaterno	: clienteInfo.AMaterno,
				Deuda 		: clienteInfo.Deuda
			} : {},
			articulos = app.CoArticulos.toJSON();
			for (var i = 0; i < articulos.length; i++) {
				delete articulos[i]['cid'];
			}			

		var venta = {
			Articulos 	: articulos,
			Cliente 	: cliente,
			Factura 	: this.factura,
			Fecha 		: new Date(),
			Moneda 		: this.moneda,
			Session 	: app.session,
			Total 		: this.getTotal(1)
		};

		app.socket.emit(app.ns.cvSave, venta);
	},
	show: function(){
		app.keytrap.pvCierre();
		this.$el.removeClass('isHidden');		
		this.isShow = true;
		this.total = parseFloat($('#total_venta .total').text());
		this.$txtTotalCV.val(this.total);
		this.totIVA = (this.total * app.conf.iva) - this.total;

		this.$txtRecibidoCV.val('').focus();
	}
});
/*
 * Comandos:
 *	- des 	: Descuento
 *	- imp 	: Importe
 */
app.vwVentaCaptura = Backbone.View.extend({
	el: '#venta_captura',
	events: {
		'click #btnAgregarPV'		: 'btnAgregarPV_Click',
		'focus #txtCodigoBarrasPV'	: 'txtCodigoBarrasPV_Focus',
		'keyup #txtCodigoBarrasPV'	: 'txtCodigoBarrasPV_Keyup'
	},
	initialize:function(){
		this.$txtCP = this.$el.find('#txtCodigoBarrasPV');

		this.$txtCP.keyfilter(/[A-Za-z0-9\*\.]+/);
	},
	btnAgregarPV_Click: function(){
		this.txtCodigoBarrasPV_Keyup({keyCode:13});
	},
	txtCodigoBarrasPV_Focus: function(){
		$('#venta_articulos .isSelected').removeClass('isSelected');
	},
	txtCodigoBarrasPV_Keyup: function(e){
		if(e.keyCode == 13){
			var codigo = this.$txtCP.val().trim(),
				data = {cb:codigo, cn:1};

			if(codigo.length) {
				var index = codigo.indexOf('*');
				if(index >= 0){
					var info = codigo.split('*');
					data.cn = roundCN(info[0], 3);
					data.cb = info[1];
				}

				app.socket.emit(app.ns.GetArticulo, data);
			}
			else if(app.CoArticulos.length > 0)
				app.helper.cierre.show();
			else
				this.$txtCP.focus();
		}
	}
});
/* ----------------------------------------- 4.-Rutas ----------------------------------------- */
app.router = Backbone.Router.extend({
	routes:{
		'': 'index',
		'PVenta': 'PVenta',
		'Articulos': 'Articulos'
	},
	index: function(){
		$('#main-container').html('');
	},
	PVenta: function(){
		app.ut.get({url:'/PVenta', done:next});

		function next (data, fnHide){
			$('#main-container').html(data);
			$('#txtCodigoBarrasPV').focus();
			new app.vwVentaCaptura();
			new app.vwVetanArticulos();
			app.helper.busqueda = new app.vwBusquedaArticulos();
			app.helper.cierre = new app.vwCierreVenta();
			app.keytrap.pvMain();

			//app.helper.cierre.show();
			fnHide();
		}
	},
	Articulos: function(){
		app.ut.get({url:'/Articulos', done:next});

		function next (data, fnHide){
			$('#main-container').html(data);
			app.keytrap.reset();

			fnHide();
		}
	}
});

/* ----------------------------------------- 5.-Load ----------------------------------------- */
$(document).on('ready', inicio);
function inicio(){
	Bases();
	$(document).foundation();
	app.ut = new utilerias();
	app.keytrap = new keytrap();
	app.ns = new nombreSockets();
	app.pag = new paginacion();
	app.templates = new templates();
	app.socket = io.connect('http://localhost:3000');
	app.socket.on(app.ns.agSearchDatos, agSearchDatos);
	app.socket.on(app.ns.cvSave, saveVenta);
	app.socket.on(app.ns.GetArticulo, addArticulo);
	
	app.conf = {
		bTipo 		: 1,
		dolar 		: 13,
		inSearch 	: false,
		iva 		: 1.16
	};
	
	app.session = {
		idTienda 	: 1,
		idUsuario	: 1,
		Tienda 		: 'Super Arvum',
		Usuario 	: 'Admin'
	};

	app.helper = {};


	new app.router;
	Backbone.history.start();
}

/* ----------------------------------------- 6.-Funciones Sockets ----------------------------------------- */
function addArticulo (data){
	if(data.err) {
		app.ut.message(data.err);
		return;
	}

	var txtCodigo = $('#txtCodigoBarrasPV');

	if(data.find) {
		var articulo = data.data,
			cantidad = data.cn,
			suma = 0;

		if(articulo.Tipo.id < 3) {
			articulo.Cantidad = 1;

			for (var i = 0; i < cantidad; i++)
				app.CoArticulos.add(articulo);
		}
		else {
			articulo.Cantidad = cantidad;
			app.CoArticulos.add(articulo);
		}
	}
	else
		console.log('articulo no encontrado');

	txtCodigo.val('').focus();
}

/*
 * tipo 	: 1.-Articulos
 *			  2.-Clientes
 */
function agSearchDatos(data){
	if(data.err) {
		app.ut.message(data.err);
		return;
	}

	var rows = '';

	switch(data.tipo) {
		case 1:
			rows = app.templates.bbArticulos(data.data);
			break;
		case 2:
			rows = app.templates.bbClientes(data.data);
			break;
	}
	
	$('#gvBusquedaAR tbody').html('').append(rows);

	data.data = null;
	var lis = app.pag.render(data);
	$('#busqueda_articulos .pagination').html('').append(lis).data('info', data);
	app.ut.hide();
}

function saveVenta(data){
	if(data.err) {
		app.ut.message(data.err);
		return;
	}
	app.CoArticulos.reset();
	app.keytrap.pvMain();
	app.helper.cierre.close();
}
/* ----------------------------------------- 7.-Funciones ----------------------------------------- */
function getDecimals(p_numero, p_decimales){
	var num = p_numero || 0,
		decimales = p_decimales || 0;

	var tmp = p_numero.toString().split('.');
	var p1 = tmp[0],
		p2 = '';
	if(tmp[1] && decimales > 0)
		p2 = '.' + tmp[1].substr(0, decimales);

	return parseFloat(p1 + p2);
}

function keytrap(){
	var once = false;

	return {
		bsBusqueda	: bsBusqueda,
		pvCierre	: pvCierre,
		pvMain		: pvMain,
		reset 		: reset
	};

	function bsBusqueda() {
		reset();

		/* 
		 * down		: 
		 * esc 		: Cierra todos los Helpers activos y establece el foco en la caja de captura de codigo de barras
		 * up 		: 
		 */
		Mousetrap.bind({
			'esc': function(){
				app.helper.busqueda.close();

				switch(app.conf.bTipo) {
					case 1:
						$('#txtCodigoBarrasPV').val('').focus();
						pvMain();
						break;
					case 2:
						$('#txtRecibidoCV').focus();
						pvCierre();
						break;
				}
			}
		});
	}

	function pvCierre() {
		reset();

		/* 
		 * esc 		: Cierra todos los Helpers activos y establece el foco en la caja de captura de codigo de barras
		 * f1 		: Abre la ventana de busqueda de clientes
		 * -		: Activa/Desactiva el cambio de moneda
		 * +		: Activa/Desactiva la facturacion
		 * * 		: Remueve el cliente
		 */
		Mousetrap.bind({
			'enter': function() {
				app.helper.cierre.save();
			},
			'esc': function(){
				app.helper.cierre.close();
				$('#txtCodigoBarrasPV').val('').focus();
				pvMain();
			},
			'f1': function(e) {
				stop(e);
				app.helper.busqueda.show(2);
				bsBusqueda();
			},
			'-': function(e) {
				stop(e);
				app.helper.cierre.$swtMoneda.find('input').not(':checked').click();
				app.helper.cierre.swtMoneda_Click();
			},
			'+': function(e) {
				stop(e);
				app.helper.cierre.$swtFactura.find('input').not(':checked').click();
				app.helper.cierre.swtFactura_Click();
			},
			'*': function(e) {
				stop(e);
				$('#pnlClienteCV').addClass('isHidden').find('#txtClienteCV').removeData().val('');
			}
		});
	}

	function pvMain(){
		reset();
		
		/* 
		 * del 		: Elimina un articulo seleccionado del grid de venta,
		 * down		: Navegacion en el grid de venta
		 * esc 		: Cierra todos los Helpers activos y establece el foco en la caja de captura de codigo de barras
		 * f1 		: Abre la ventana de busqueda de articulos
		 * f4 		: Elimina todos los articulos del grid de venta
		 * left 	: Quita el importe de un articulo seleccionado del grid de venta
		 * right 	: Agrega el importe de un articulo seleccionado del grid de venta
		 * tab 		: Agrega el ultimo articulo al grid de venta
		 * up 		: Navegacion en el grid de venta
		 */
		Mousetrap.bind({
			'del': function(){
				var delRow = $('#venta_articulos table tbody tr.isSelected');
                if(app.CoArticulos.length > 0 && delRow.html() !== undefined) {
                    var articulo = app.CoArticulos.get(delRow.attr('id'));
                                        
                    if(app.CoArticulos.length-1 == 0)
                        $('#txtCodigoBarrasPV').focus();
                    else if(delRow.next().html() !== undefined)
                        delRow.next().addClass('isSelected');
                    else if(delRow.prev().html() !== undefined)
                    	delRow.prev().addClass('isSelected');
                    else
                    	$('#pnlArticulos tbody tr:first-child').addClass('isSelected');

                    app.CoArticulos.remove(articulo);
                }
			},
			'down': function(e){
				if(app.CoArticulos.length == 0)
					return;

				var nextRow = $('#gvArticulosVM tbody tr.isSelected').next().html();

				$('#txtCodigoBarrasPV').blur();
				if(nextRow === undefined) {
					$('#gvArticulosVM tbody tr.isSelected').removeClass('isSelected');
		            $('#gvArticulosVM tbody tr:first-child').addClass('isSelected');
				}
				else
		            $('#gvArticulosVM tbody tr.isSelected').removeClass('isSelected').next().addClass('isSelected');
			},
			'esc': function(){
				app.helper.busqueda.close();
				$('#txtCodigoBarrasPV').val('').focus();			
			},
			'f1': function(e){
				stop(e);
				app.helper.busqueda.show(1);
				bsBusqueda();
			},
			'f4': function(e){
				stop(e);
				app.CoArticulos.reset();
			},
			'left': function(){
				var row = $('#venta_articulos .isSelected');
				if(row.html() !== undefined) {
					var articulo = app.CoArticulos.get(row.attr('id'));
					if(articulo.get('EspImporte') == 0)
						return;

					var total = parseFloat($('#venta_articulos .total').text()) - articulo.get('Importe');
					$('#venta_articulos .total').text(total);

					articulo.set({EspImporte:0, Total:articulo.get('Total') - articulo.get('Importe')});
				}
			},
			'right': function(){
				var row = $('#venta_articulos .isSelected');
				if(row.html() !== undefined) {
					var articulo = app.CoArticulos.get(row.attr('id'));
					if(articulo.get('EspImporte') > 0)
						return;

					var total = parseFloat($('#venta_articulos .total').text()) + articulo.get('Importe');
					$('#venta_articulos .total').text(total);

					articulo.set({EspImporte:articulo.get('Importe'), Total:articulo.get('Total') + articulo.get('Importe')});
				}
			},
			'tab': function(e){
				stop(e);
				var id = $($('#gvArticulosVM tbody tr')[0]);
				if(id.attr('id')) {
					var articulo = app.CoArticulos.get(id.attr('id'));
					articulo = articulo.toJSON();
					delete articulo.cid;

					app.CoArticulos.add(articulo);
				}
			},
			'up': function(){
				if(app.CoArticulos.length == 0)
					return;

				var nextRow = $('#gvArticulosVM tbody tr.isSelected').prev().html();

				$('#txtCodigoBarrasPV').blur();
				if(nextRow === undefined) {
					$('#gvArticulosVM tbody tr.isSelected').removeClass('isSelected');
		            $('#gvArticulosVM tbody tr:last-child').addClass('isSelected');
				}
				else
		            $('#gvArticulosVM tbody tr.isSelected').removeClass('isSelected').prev().addClass('isSelected');
			}
		});
	}

	function reset(){
		Mousetrap.reset();
	}

	function stop(e){
		if (e.preventDefault)
			e.preventDefault();
		else
	        e.returnValue = false;// internet explorer
	}
}

function nombreSockets(){
	var nombresFunctiones = {
								agSearchDatos	: 'agSearchDatos',
								cvSave 			: 'cvSave',
								GetArticulo 	: 'GetArticulo'
							};

	return nombresFunctiones;
}

function utilerias() {
	return {
		get 	: get,
		hide 	: hide,
		message : message,
		next 	: next,
		rndmInt : rndmInt,
		rndmStr : rndmStr,
		show	: show
	};

	/*
	 * p_url		: url a la cual se va a hacer la peticion
	 * p_data		: objeto tipo JSON que contiene la informacion a mandas
	 * p_done		: funcion que se ejecutara si todo sale bien
	 * p_err		: funcion que se ejecutara si ocurrio algun error
	 * p_type		: tipo de dato que se espera recibir [json, html, text]
	 * p_loading	: true/false para activar o no el loading panel
	 */
	function get(p_params) {
		var url = p_params.url || '/PVenta',
			done = p_params.done || fnDone,
			err = p_params.err || fnErr,
			type = p_params.type || 'text',
			data = p_params.data || {},
			loading = p_params.loading === undefined ? true : p_params.loading;

		if (loading)
			show();
		$.get(url, data, type).done(fnNext).fail(err);

		function fnNext(data){
			done(data, hide);
		}

		function fnDone(data, fnHide){
			console.log(data);
			fnHide();
		}

		function fnErr(xhr, err, x){
			console.log(xhr);
			if (loading)
				hide();
		}
	}

	function hide(fn, p_arrs) {
		$('#loading').fadeOut(function(){
			$(this).addClass('isHidden');
			next(fn, p_arrs);
		});
	}

	function message(p_message, p_time){
		var message = p_message || '',
			time = p_time || 5000,
			alerta = $(app.templates.mAlert({message:message}));

		$('#pnlAlert').prepend(alerta);

		setTimeout(function(){
			alerta.find('.close').click();
		}, time);
	}

	function next(fn, p_arrs){
		if(typeof fn === 'function')
			fn(p_arrs);
	}

	function rndmInt(){
	    return Math.floor((Math.random()*8)+1).toString();
	}

	function rndmStr(){
	    var text = "";
	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	    for( var i=0; i < 5; i++ )
	        text += possible.charAt(Math.floor(Math.random() * possible.length));
	    return text;
	}

	function show() {
		$('#loading').fadeIn().removeClass('isHidden');
	}
}

function paginacion() {

	return {
		render: render
	};

	function render(p_info){
		var info = p_info,
			limitArt = 10,
			limitPag = 10,
			totalPag = Math.ceil( (info.max + ((info.current-1)*10)) / limitPag);
			lis = '<li class="arrow begin"><a href="#" data-num="1">&laquo;</a></li>',
			incremento = Getincremento(info.current),
			i = incremento;

		if(info.current > limitPag)
			lis += '<li><a href="#" data-num="' + (i - 1) +'">&hellip;</a></li>';

		while(i <= incremento + 10) {
			if(i > totalPag || i > (incremento + 10) - 1)
				break;
			
			var pag = {num:i, val:i};
			if(info.current == i)
				pag.current = true;

			lis += app.templates.pLis(pag);
			i++;
		}

		if(( ((info.current*10)+info.max) - ((incremento-1)*10) )/100 > 1)
			lis += '<li><a href="#" data-num="' + i +'">&hellip;</a></li>';

		lis += '<li class="arrow end"><a href="#" data-num="-1">&raquo;</a></li>';

		return $(lis);
	}

	function Getincremento(p_val){
		var str = (p_val - 1).toString(),
			res = str.length == 1 ? "0" : str.substr(0, str.length-1);

		//for (var i = 0; i < str.length-1; i++) {
		res += "0";
		//}

		return parseInt(res) + 1;
	}
}

function roundCN(p_numero, p_decimales){
	var num = p_numero || 0;
	var decimales = '1';
	for (var i = 0; i < p_decimales; i++)
		decimales += '0';
	decimales = parseInt(decimales);

	return Math.round(parseFloat(num) * decimales) / decimales;	
}
/* ----------------------------------------- 8.-Templates ----------------------------------------- */
function templates(){
	Handlebars.registerHelper('rowToJSON', function(){ 
		return JSON.stringify(this); 
	});

	var alertas = Handlebars.compile("<div data-alert class='alert-box alert radius'><label>{{message}}</label><a href='#' class='close'><i class='fa fa-times fa-inverse'></i></a></div>");
		buqueda_base = Handlebars.compile("<strong>Busqueda:</strong> <input id='txtBusquedaAR' class='mousetrap' type='text'/> <table id='gvBusquedaAR' class='hovered'> <thead></thead> <tbody></tbody> </table> <div class='pagination-centered'> <ul class='pagination'> </ul> </div>"),
		busqueda_header_articulos = Handlebars.compile("<tr class='row'> <th class='small-3'>CodigoBarras</th><th class='small-5'>Articulo</th><th class='small-2'>Tipo</th><th class='small-1'>Costo</th><th class='small-1'>Importe</th> </tr>"),
		busqueda_body_articulos = Handlebars.compile("{{#.}}<tr id='{{_id}}' data-info='{{#rowToJSON}}{{.}}{{/rowToJSON}}'><td></td><td>{{CodigoBarras}}</td><td>{{Articulo}}</td><td>{{Tipo.Descripcion}}</td><td>{{Costo}}</td><td>{{Importe}}</td></tr>{{/.}}"),

		busqueda_header_clientes = Handlebars.compile("<tr class='row'> <th class='small-4'>Cliente</th><th class='small-2'>Telefono</th><th class='small-5'>Direccion</th><th class='small-1'>Deuda</th> </tr>"),
		busqueda_body_clientes = Handlebars.compile("{{#.}}<tr id='{{_id}}' data-info='{{#rowToJSON}}{{.}}{{/rowToJSON}}'><td></td><td>{{APaterno}} {{AMaterno}} {{Nombre}}</td><td>{{Telefono}}</td><td>{{Direccion}}</td><td>{{Deuda}}</td></tr>{{/.}}"),

		cierre_centa = Handlebars.compile('<div id="pnlCierreCV" class="small-6 small-offset-3 columns panel"><div class="panel-header"><span>Cierre de venta</span></div><div class="row collapse"><div class="small-2 columns"><label class="prefix text-right" for="txtRecibidoCV">Recibido:</label></div><div class="small-10 columns"><input type="text" placeholder="0" id="txtRecibidoCV" class="isNumber mousetrap"></div></div><div class="row collapse"><div class="small-2 columns"><span class="prefix text-right">Total:</span></div><div class="small-10 columns"><input type="text" placeholder="0" disabled="disabled" id="txtTotalCV" class="isNumber"></div></div><div class="row collapse"><div class="small-2 columns"><span class="prefix text-right">Cambio:</span></div><div class="small-10 columns"><input type="text" placeholder="0" disabled="disabled" id="txtCambioCV" class="isNumber"></div></div><div class="row collapse"><div class="small-2 columns"><span class="prefix text-right">Facturar:</span></div><div class="small-4 columns"><div id="swtFactura" class="switch small"><input type="radio" name="switch-factura" checked="checked" id="rblNoCV" data-val="false"><label for="rblNoCV" onclick="">No</label><input type="radio" name="switch-factura" id="rblSiCV" data-val="true"><label for="rblSiCV" onclick="">Si</label><span></span></div></div><div class="small-2 columns"><span class="prefix text-right">Moneda:</span></div><div class="small-4 columns"><div id="swtMoneda" class="switch small"><input type="radio" name="switch-cambio" checked="checked" id="rblPesosCV" data-val="1"><label for="rblPesosCV" onclick="">Pesos</label><input type="radio" name="switch-cambio" id="rblDolarCV" data-val="2"><label for="rblDolarCV" onclick="">Dolar</label><span></span></div></div></div><div id="pnlClienteCV" class="row collapse isHidden"><div class="small-2 columns"><label class="prefix text-right">Cliente:</label></div><div class="small-10 columns"><input type="text" placeholder="Cliente..." disabled="disabled" id="txtClienteCV" ></div></div><button type="button" id="btnCerrarCV" class="small expand">Cerrar venta</button></div>'),
		lis_paginacion = Handlebars.compile('<li {{#current}} class="current" {{/current}}><a href="#" data-num="{{num}}">{{val}}</a></li>'),
		venta_ariculo = Handlebars.compile("<tr id='{{cid}}' data-importe='{{Importe}}'> <td class='special'>&nbsp</td><td>{{CodigoBarras}}</td><td>{{Articulo}}</td><td>{{Cantidad}}</td><td>{{Costo}}</td><td>{{EspImporte}}</td><td>{{Total}}</td> </tr>");

	return {
		bBase: buqueda_base,
		bhArticulos: busqueda_header_articulos,
		bbArticulos: busqueda_body_articulos,
		bhClientes: busqueda_header_clientes,
		bbClientes: busqueda_body_clientes,
		cCierre: cierre_centa,
		mAlert: alertas,
		pLis: lis_paginacion,
		vArticulo: venta_ariculo
	}
}
/* ----------------------------------------- 9.-Pruebas ----------------------------------------- */
function Test(){
	var estres = {
		addArticulo: EstresAddArticulo
	};

	return {
		estres: estres 
	};

	function EstresAddArticulo(p_vista){
		setTimeout(function(){
			setInterval(function(){
				var random = Math.floor((Math.random()*8)+1).toString();
				$('#txtCodigoBarrasPV').val(random);
				p_vista.txtCodigoBarrasPV_Keyup({keyCode:13});
			}, 100);
		}, 10000);
	}
}
/* ----------------------------------------- 0.-Prototype ----------------------------------------- */
function Bases(){
	if (typeof String.prototype.startsWith != 'function') {
	  // see below for better implementation!
	  String.prototype.startsWith = function (str){
	    return this.indexOf(str) == 0;
	  };
	}
}