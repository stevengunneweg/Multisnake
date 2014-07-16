from gevent import monkey; monkey.patch_all()
import json

from socketio import socketio_manage
from socketio.server import SocketIOServer
from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin, BroadcastMixin


class SendToOneMixin(object):
    def sendToOne(self, event, data, target):
        pkt = dict(type="event",
                   name=event,
                   args=data,
                   endpoint=self.ns_name)

        for sessid, socket in self.socket.server.sockets.iteritems():
            if sessid == target:
                socket.send_packet(pkt)


class MultiSnake(BaseNamespace, RoomsMixin, BroadcastMixin, SendToOneMixin):
    def on_client_request(self):
        self.broadcast_event_not_me('server_request', self.socket.sessid)

    def recv_disconnect(self):
        # Remove nickname from the list.
        self.disconnect(silent=True)

    def on_client_data(self, data):
        steven = json.loads(data)
        blah = {
            'target': self.socket.sessid,
            'connectionId': steven['connectionId'],
            'connectionData': steven['connectionData']
        }

        _data = json.dumps(blah)
        self.sendToOne('server_data', _data, steven['target'])

    def on_user_message(self, msg):
        self.emit_to_room('', 'msg_to_room',
            self.socket.session['nickname'], msg)

    def recv_message(self, message):
        print "PING!!!", message

class Application(object):
    def __init__(self):
        self.buffer = []
        # Dummy request object to maintain state between Namespace
        # initialization.
        self.request = {
            'nicknames': [],
        }

    def __call__(self, environ, start_response):
        path = environ['PATH_INFO'].strip('/')

        if not path:
			path = 'index.html'

        if path.startswith('static/') or path.endswith('html') or path.endswith('js'):
            try:
                data = open(path).read()
            except Exception:
                return not_found(start_response)

            if path.endswith(".js"):
                content_type = "text/javascript"
            elif path.endswith(".css"):
                content_type = "text/css"
            elif path.endswith(".swf"):
                content_type = "application/x-shockwave-flash"
            else:
                content_type = "text/html"

            start_response('200 OK', [('Content-Type', content_type)])
            return [data]

        if path.startswith("socket.io"):
            socketio_manage(environ, {'': MultiSnake}, self.request)
        else:
            return not_found(start_response)


def not_found(start_response):
    start_response('404 Not Found', [])
    return ['<h1>Not Found</h1>']


if __name__ == '__main__':
    print 'Listening on port 8080 and on port 843 (flash policy server)'
    SocketIOServer(('0.0.0.0', 8080), Application(),
        resource="socket.io", policy_server=True,
        policy_listener=('0.0.0.0', 10843)).serve_forever()
