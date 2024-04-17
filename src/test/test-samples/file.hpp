#define A
#define B

#define MAX_OK(x , y)   \
 ((x) > (y)             \
 ? (x)                  \
 : (y))

#define MAX_ERR(x , y)  \
 ((x) > (y)             
    ? (x)               \
    : (y))

#if defined A
    int a = 1;
#endif

