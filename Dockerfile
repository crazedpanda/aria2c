FROM golang:latest

ENV GO111MODULE=on

COPY /src /go/src

WORKDIR /go/src

RUN go mod download

CMD ["go","run","main.go"]
