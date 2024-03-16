// #define A 1
#define B 1

#define MAX_OK(x , y)   \
 ((x) > (y)             \
 ? (x)                  \
 : (y))

#define MAX_ERR(x , y)  \
 ((x) > (y)             
 ? (x)                  \
 : (y)) 

int main() {
    int a,b;

#ifdef A
#ifdef B
    int b = 2;
#endif
    int a = 1;
#endif


    printf("MAX_OK: %d\n", MAX_OK(a, b));

  return 0;
}
