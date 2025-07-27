#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <sys/ioctl.h>  // Добавлен для ioctl и SIOCGIFINDEX
#include <unistd.h>     // Добавлен для close
#include <net/if.h>
#include <linux/if_packet.h>

int main(int argc, char *argv[]) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <interface> <hex_data>\n", argv[0]);
        return 1;
    }

    // Convert hex to bytes
    char* hex = argv[2];
    size_t len = strlen(hex)/2;
    unsigned char data[len];
    for (size_t i = 0; i < len; i++)
        sscanf(hex + 2*i, "%2hhx", &data[i]);

    // Create raw socket
    int sock = socket(AF_PACKET, SOCK_RAW, 0);
    if (sock < 0) {
        perror("socket");
        return 1;
    }

    // Get interface index
    struct ifreq ifr;
    strncpy(ifr.ifr_name, argv[1], IFNAMSIZ);
    if (ioctl(sock, SIOCGIFINDEX, &ifr) < 0) {
        perror("ioctl");
        close(sock);
        return 1;
    }

    // Send packet
    struct sockaddr_ll addr = {
        .sll_family = AF_PACKET,
        .sll_ifindex = ifr.ifr_ifindex
    };
    
    if (sendto(sock, data, len, 0, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("sendto");
    } else {
        printf("ok");
    }

    close(sock);
    return 0;
}